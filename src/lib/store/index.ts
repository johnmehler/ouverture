import { writable, type Writable } from 'svelte/store';
import type { Game, ChessPlatform } from '$lib/types';
import type { PositionNode, OpeningStats } from '$lib/chess/analysis';

export const user = writable({
    username: '',
    platform: 'lichess' as ChessPlatform
});

export const games: Writable<Game[]> = writable([]);

export const positions: Writable<Map<string, PositionNode>> = writable(new Map());
export const openings: Writable<Map<string, OpeningStats>> = writable(new Map());

export const analysisQueue: Writable<string[]> = writable([]);

export const isScanning = writable(false);
export const progress = writable({
    fetched: 0,
    analyzed: 0,
    total: 0,
    analyzeTotal: 0
});

// Game review
export interface Mistake {
    fen: string;             // Position before the user's move
    moveNumber: number;      // Full move number (e.g. 12)
    userMove: string;        // SAN of the user's move (e.g. "Nf3")
    userMoveLan: string;     // LAN of the user's move (e.g. "g1f3") for arrow drawing
    bestMove: string;        // LAN of the engine's best move
    evalBefore: number;      // Eval (in pawns) before user's move
    evalAfter: number;       // Eval after user's move
    evalDrop: number;        // How much eval dropped (always positive)
    playerColor: 'white' | 'black';
}

export const selectedGame: Writable<Game | null> = writable(null);
export const gameMistakes: Writable<Mistake[]> = writable([]);
export const isAnalyzingGame = writable(false);
export const gameAnalysisProgress = writable({ current: 0, total: 0 });
