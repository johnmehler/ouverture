export type ChessPlatform = 'lichess';

export type GameSpeed = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';

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
    moveCount: number;        // total number of half-moves (plies)
    playerColor: 'white' | 'black';
    myRating: number;
    opponentName: string;
    opponentRating: number;
    // Extra metadata
    speed: GameSpeed;
    openingName: string;      // e.g. "Sicilian Defense: Najdorf Variation"
    termination: string;      // e.g. "checkmate", "resignation", "timeout", "draw"
    durationSeconds: number;  // game duration in seconds (0 if unknown)
}

export interface FetchOptions {
    username: string;
    limit?: number;
    since?: number; // timestamp
    perfType?: string; // 'blitz', 'rapid', etc
}
