import { Chess } from 'chess.js';
import type { Game } from '$lib/types';

export interface PositionNode {
    fen: string;
    playCount: number;
    userMoves: Record<string, number>; // moveSan -> count
    engineEval?: {
        cp?: number;
        mate?: number;
        depth: number;
        bestMove: string;
    };
}

export interface OpeningStats {
    name: string;
    asWhite: { games: number; wins: number; losses: number; draws: number };
    asBlack: { games: number; wins: number; losses: number; draws: number };
}

export interface AnalyzedGame extends Game {
    fens: string[];
}

const MIN_PLY = 6; // Start processing after move 3
const MAX_PLY = 60; // Up to move 30

export function processGames(games: Game[]): { positionMap: Map<string, PositionNode>, openingStats: Map<string, OpeningStats> } {
    const positionMap = new Map<string, PositionNode>();
    const openingStats = new Map<string, OpeningStats>();

    for (const game of games) {
        try {
            const chess = new Chess();
            try {
                chess.loadPgn(game.pgn);
            } catch (e) {
                console.warn(`Failed to process PGN for game ${game.id}`, e);
                continue;
            }

            // Extract Opening Info (if available from PGN headers)
            // Lichess PGNs usually have 'Opening' header
            const openingName = chess.header()['Opening'] || 'Unknown Opening';

            // Normalize opening name (e.g., remove specific variation to group broader openings if desired)
            // For now, let's keep the full name but maybe strip ECO code if preferred.

            if (!openingStats.has(openingName)) {
                openingStats.set(openingName, {
                    name: openingName,
                    asWhite: { games: 0, wins: 0, losses: 0, draws: 0 },
                    asBlack: { games: 0, wins: 0, losses: 0, draws: 0 }
                });
            }

            const stats = openingStats.get(openingName)!;
            const isWhite = game.playerColor === 'white';
            const statGroup = isWhite ? stats.asWhite : stats.asBlack;

            statGroup.games++;
            if (game.result === '1-0') isWhite ? statGroup.wins++ : statGroup.losses++;
            else if (game.result === '0-1') isWhite ? statGroup.losses++ : statGroup.wins++;
            else statGroup.draws++;


            const history = chess.history({ verbose: true });
            const replayParams = new Chess();

            // Iterate through moves, but only collect data between MIN_PLY and MAX_PLY
            for (let i = 0; i < Math.min(history.length, MAX_PLY); i++) {
                const move = history[i];

                // Current Ply is 'i'. 
                // i=0 is White's first move (Ply 1).
                // i=1 is Black's first move (Ply 2).
                // We want to skip first 3 moves (6 plies).
                // So if i < 6, we just replay but don't record.

                const currentPly = i + 1;

                if (currentPly >= MIN_PLY) {
                    const turnColor = replayParams.turn() === 'w' ? 'white' : 'black';
                    const isUserTurn = turnColor === game.playerColor;

                    if (isUserTurn) {
                        const fen = replayParams.fen();
                        // Normalize FEN to group positions
                        const fenKey = fen.split(' ').slice(0, 4).join(' ');

                        if (!positionMap.has(fenKey)) {
                            positionMap.set(fenKey, {
                                fen: fenKey,
                                playCount: 0,
                                userMoves: {}
                            });
                        }

                        const node = positionMap.get(fenKey)!;
                        node.playCount++;

                        const moveSan = move.san;
                        node.userMoves[moveSan] = (node.userMoves[moveSan] || 0) + 1;
                    }
                }

                replayParams.move(move);
            }

        } catch (err) {
            console.error(`Error processing game ${game.id}`, err);
        }
    }

    return { positionMap, openingStats };
}
