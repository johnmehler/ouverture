import { Chess } from 'chess.js';
import type { Game } from '$lib/types';
import type { Mistake } from '$lib/store';
import { gameMistakes, isAnalyzingGame, gameAnalysisProgress } from '$lib/store';

const MISTAKE_THRESHOLD = 1.0; // Eval drop > 1.0 pawn = mistake
const SF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js';

/**
 * Analyze a single game by replaying it move-by-move with Stockfish.
 * Finds positions where the user's move caused the eval to drop by > MISTAKE_THRESHOLD.
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

    // Evaluate all positions with Stockfish
    const evals = await evaluatePositions(fens, (done) => {
        gameAnalysisProgress.set({ current: done, total: fens.length });
    });

    // Now find mistakes
    const mistakes: Mistake[] = [];
    const replay2 = new Chess();

    for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const turnColor = replay2.turn() === 'w' ? 'white' : 'black';
        const isUserTurn = turnColor === game.playerColor;

        if (isUserTurn && i + 1 < fens.length) {
            const evalBefore = evals[i];
            const evalAfter = evals[i + 1];

            if (evalBefore !== null && evalAfter !== null) {
                // evalBefore: from side-to-move (user), positive = good for user
                // evalAfter: from side-to-move (opponent), positive = good for opponent
                const userEvalBefore = evalBefore;
                const userEvalAfter = -evalAfter;
                const drop = userEvalBefore - userEvalAfter;

                if (drop > MISTAKE_THRESHOLD) {
                    mistakes.push({
                        fen: fens[i],
                        moveNumber: Math.floor(i / 2) + 1,
                        userMove: move.san,
                        userMoveLan: move.from + move.to,
                        bestMove: '',
                        evalBefore: userEvalBefore,
                        evalAfter: userEvalAfter,
                        evalDrop: drop,
                        playerColor: game.playerColor
                    });
                }
            }
        }

        replay2.move(move);
    }

    gameMistakes.set(mistakes);
    isAnalyzingGame.set(false);
}

/**
 * Create a Stockfish worker from CDN via fetch + blob URL.
 * Returns the worker and a promise that resolves when UCI is ready.
 */
async function createStockfishWorker(): Promise<Worker> {
    const resp = await fetch(SF_URL);
    const text = await resp.text();
    const blob = new Blob([text], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    // Wait for UCI init
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
 * Evaluate an array of FEN positions sequentially using Stockfish.
 * Returns evals in pawns from side-to-move perspective.
 */
async function evaluatePositions(
    fens: string[],
    onProgress?: (done: number) => void
): Promise<(number | null)[]> {
    if (fens.length === 0) return [];

    const results: (number | null)[] = new Array(fens.length).fill(null);

    let sfWorker: Worker;
    try {
        sfWorker = await createStockfishWorker();
    } catch (e) {
        console.error('Failed to create Stockfish worker:', e);
        return results;
    }

    for (let i = 0; i < fens.length; i++) {
        try {
            results[i] = await evaluateSinglePosition(sfWorker, fens[i], 12);
        } catch (e) {
            console.error(`Failed to evaluate position ${i}:`, e);
            results[i] = null;
        }
        onProgress?.(i + 1);
    }

    sfWorker.terminate();
    return results;
}

/**
 * Evaluate a single FEN position. Returns score in pawns from side-to-move perspective.
 */
function evaluateSinglePosition(worker: Worker, fen: string, depth: number): Promise<number> {
    return new Promise((resolve) => {
        let score = 0;

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
                worker.removeEventListener('message', handler);
                resolve(score);
            }
        };

        worker.addEventListener('message', handler);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
    });
}
