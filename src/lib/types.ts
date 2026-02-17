export type ChessPlatform = 'lichess';

export interface Game {
    id: string;
    platform: ChessPlatform;
    pgn: string;
    white: string;
    black: string;
    date: string;
    url: string;
    result: '1-0' | '0-1' | '1/2-1/2' | '*';
    // Parsed fields
    moves: string[];
    playerColor: 'white' | 'black';
    myRating: number;
    opponentName: string;
    opponentRating: number;
}

export interface FetchOptions {
    username: string;
    limit?: number;
    since?: number; // timestamp
    perfType?: string; // 'blitz', 'rapid', etc
}
