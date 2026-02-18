import { Chess } from 'chess.js';
import type { Game } from '$lib/types';
import type { Mistake } from '$lib/store';
import { gameMistakes, isAnalyzingGame, gameAnalysisProgress } from '$lib/store';

const MISTAKE_THRESHOLD = 1.0; // Eval drop > 1.0 pawn = mistake
const ACCEPTABLE_MARGIN = 0.2; // Moves within 0.2 pawns of best are acceptable
const SF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js';

/**
 * Analyze a single game by replaying it move-by-move with Stockfish.
 * Finds positions where the user's move caused the eval to drop by > MISTAKE_THRESHOLD.
 * For each mistake, also finds the best move and acceptable alternatives.
 */
export async function analyzeGameForMistakes(game: Game): Promise<void> {
    isAnalyzingGame.set(true);
    gameMistakes.set([]);
    gameAnalysisProgress.set({ current: 0, total: 0 });

    const chess = new Chess();
    try {
        chess.loadPgn(game.pgn);
    } catch (e) {
        console.error('Failed to load PGN for analysis', e);
        isAnalyzingGame.set(false);
        return;
    }

    const history = chess.history({ verbose: true });
    const replay = new Chess();

    // Collect all FENs to evaluate (position before each move)
    const fens: string[] = [];
    for (let i = 0; i < history.length; i++) {
        fens.push(replay.fen());
        replay.move(history[i]);
    }

    gameAnalysisProgress.set({ current: 0, total: fens.length });

    let sfWorker: Worker;
    try {
        sfWorker = await createStockfishWorker();
    } catch (e) {
        console.error('Failed to create Stockfish worker:', e);
        isAnalyzingGame.set(false);
        return;
    }

    // Evaluate all positions
    const evals: { score: number; bestMove: string }[] = [];
    for (let i = 0; i < fens.length; i++) {
        try {
            evals.push(await evaluateSinglePosition(sfWorker, fens[i], 12));
        } catch (e) {
            evals.push({ score: 0, bestMove: '' });
        }
        gameAnalysisProgress.set({ current: i + 1, total: fens.length });
    }

    // Find mistakes
    const mistakes: Mistake[] = [];
    const replay2 = new Chess();

    for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const turnColor = replay2.turn() === 'w' ? 'white' : 'black';
        const isUserTurn = turnColor === game.playerColor;

        if (isUserTurn && i + 1 < fens.length) {
            const evalBefore = evals[i].score;
            const evalAfter = evals[i + 1].score;

            // evalBefore: from side-to-move (user), positive = good for user
            // evalAfter: from side-to-move (opponent), positive = good for opponent
            const userEvalBefore = evalBefore;
            const userEvalAfter = -evalAfter;
            const drop = userEvalBefore - userEvalAfter;

            if (drop > MISTAKE_THRESHOLD) {
                const bestMoveLan = evals[i].bestMove;

                // Convert bestMove LAN to SAN
                const tempChess = new Chess(fens[i]);
                let bestMoveSan = bestMoveLan;
                try {
                    const moveObj = tempChess.move({
                        from: bestMoveLan.slice(0, 2),
                        to: bestMoveLan.slice(2, 4),
                        promotion: bestMoveLan.length > 4 ? bestMoveLan[4] as any : undefined
                    });
                    if (moveObj) bestMoveSan = moveObj.san;
                } catch { /* keep LAN */ }

                // Find acceptable moves (within ACCEPTABLE_MARGIN of best)
                const acceptableMoves = await findAcceptableMoves(sfWorker, fens[i], userEvalBefore, ACCEPTABLE_MARGIN);

                mistakes.push({
                    fen: fens[i],
                    moveNumber: Math.floor(i / 2) + 1,
                    userMove: move.san,
                    userMoveLan: move.from + move.to,
                    bestMove: bestMoveLan,
                    bestMoveSan,
                    acceptableMoves,
                    evalBefore: userEvalBefore,
                    evalAfter: userEvalAfter,
                    evalDrop: drop,
                    playerColor: game.playerColor
                });
            }
        }

        replay2.move(move);
    }

    sfWorker.terminate();
    gameMistakes.set(mistakes);
    isAnalyzingGame.set(false);
}

/**
 * Find all legal moves that are within `margin` pawns of the best move's eval.
 */
async function findAcceptableMoves(worker: Worker, fen: string, bestEval: number, margin: number): Promise<string[]> {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    const acceptable: string[] = [];

    // For each legal move, evaluate resulting position
    for (const move of legalMoves) {
        const tempChess = new Chess(fen);
        tempChess.move(move);
        const resultFen = tempChess.fen();

        try {
            const result = await evaluateSinglePosition(worker, resultFen, 10);
            // Result is from opponent's perspective, so negate
            const moveEval = -result.score;

            if (bestEval - moveEval <= margin) {
                acceptable.push(move.from + move.to + (move.promotion ?? ''));
            }
        } catch {
            // skip
        }
    }

    return acceptable;
}

/**
 * Create a Stockfish worker from CDN via fetch + blob URL.
 */
export async function createStockfishWorker(): Promise<Worker> {
    const resp = await fetch(SF_URL);
    const text = await resp.text();
    const blob = new Blob([text], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    await new Promise<void>((resolve) => {
        const handler = (e: MessageEvent) => {
            const line = typeof e.data === 'string' ? e.data : String(e.data);
            if (line === 'uciok') {
                worker.postMessage('isready');
            }
            if (line === 'readyok') {
                worker.removeEventListener('message', handler);
                resolve();
            }
        };
        worker.addEventListener('message', handler);
        worker.postMessage('uci');
    });

    return worker;
}

/**
 * Evaluate a single FEN position. Returns score in pawns + bestmove LAN.
 */
export function evaluateSinglePosition(worker: Worker, fen: string, depth: number): Promise<{ score: number; bestMove: string }> {
    return new Promise((resolve) => {
        let score = 0;
        let bestMove = '';

        const handler = (e: MessageEvent) => {
            const line = typeof e.data === 'string' ? e.data : String(e.data);

            if (line.startsWith('info') && line.includes('score')) {
                const cpMatch = line.match(/score cp (-?\d+)/);
                const mateMatch = line.match(/score mate (-?\d+)/);
                if (cpMatch) {
                    score = parseInt(cpMatch[1]) / 100;
                } else if (mateMatch) {
                    const mateIn = parseInt(mateMatch[1]);
                    score = mateIn > 0 ? 100 : -100;
                }
            }

            if (line.startsWith('bestmove')) {
                bestMove = line.split(' ')[1] || '';
                worker.removeEventListener('message', handler);
                resolve({ score, bestMove });
            }
        };

        worker.addEventListener('message', handler);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
    });
}
