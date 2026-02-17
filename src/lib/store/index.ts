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
