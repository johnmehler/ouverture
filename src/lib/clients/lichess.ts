import type { Game, FetchOptions, GameSpeed } from '$lib/types';

function parseTermination(status: string, winner?: string): string {
    switch (status) {
        case 'mate': return 'checkmate';
        case 'resign': return 'resignation';
        case 'outoftime': return 'timeout';
        case 'timeout': return 'timeout';
        case 'draw': return 'draw';
        case 'stalemate': return 'stalemate';
        default: return status || 'unknown';
    }
}

function countMoves(pgn: string): number {
    if (!pgn) return 0;
    // Strip comments, variations, headers
    const cleaned = pgn
        .replace(/\{[^}]*\}/g, '')    // Remove comments
        .replace(/\([^)]*\)/g, '')     // Remove variations
        .replace(/\[.*?\]/g, '')       // Remove headers
        .replace(/\d+\.\.\./g, '')     // Remove "1..."
        .replace(/\d+\./g, '')         // Remove "1."
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')  // Remove result
        .trim();
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).filter(s => s.length > 0).length;
}

function buildGame(data: any, username: string): Game | null {
    const whiteName = data.players?.white?.user?.name || 'Anonymous';
    const blackName = data.players?.black?.user?.name || 'Anonymous';
    const isWhite = whiteName.toLowerCase() === username.toLowerCase();

    if (!data.id) return null;

    const pgn = data.pgn || '';
    const moveCount = data.turns ?? countMoves(pgn);
    const durationMs = (data.lastMoveAt && data.createdAt) ? (data.lastMoveAt - data.createdAt) : 0;

    return {
        id: data.id,
        platform: 'lichess',
        pgn,
        white: whiteName,
        black: blackName,
        date: new Date(data.createdAt).toISOString(),
        url: `https://lichess.org/${data.id}`,
        result: data.winner ? (data.winner === 'white' ? '1-0' : '0-1') : '1/2-1/2',
        playerColor: isWhite ? 'white' : 'black',
        myRating: isWhite ? data.players?.white?.rating : data.players?.black?.rating,
        opponentName: isWhite ? blackName : whiteName,
        opponentRating: isWhite ? data.players?.black?.rating : data.players?.white?.rating,
        moves: [],
        moveCount,
        speed: (data.speed || 'rapid') as GameSpeed,
        openingName: data.opening?.name || '',
        termination: parseTermination(data.status, data.winner),
        durationSeconds: Math.round(durationMs / 1000),
    };
}

export async function fetchLichessGames(
    options: FetchOptions,
    onProgress?: (count: number) => void
): Promise<Game[]> {
    const { username, limit = 100 } = options;
    const url = `https://lichess.org/api/games/user/${username}`;

    const params = new URLSearchParams({
        max: limit.toString(),
        pgnInJson: 'true',
        clocks: 'false',
        evals: 'false',
        opening: 'true',
        perfType: options.perfType || 'blitz,rapid,classical,bullet'
    });

    if (options.since) {
        params.append('since', options.since.toString());
    }

    try {
        const response = await fetch(`${url}?${params.toString()}`, {
            headers: {
                'Accept': 'application/x-ndjson'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`User ${username} not found on Lichess`);
            }
            throw new Error(`Lichess API error: ${response.statusText}`);
        }

        if (!response.body) {
            return [];
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const games: Game[] = [];

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const data = JSON.parse(line);
                    const game = buildGame(data, username);
                    if (game) {
                        games.push(game);
                        onProgress?.(games.length);
                    }
                } catch (e) {
                    console.error('Failed to parse game line', e);
                }
            }
        }

        // Handle remaining buffer
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                const game = buildGame(data, username);
                if (game) games.push(game);
            } catch {
                // Ignore
            }
        }

        return games;

    } catch (error) {
        console.error('Fetch Lichess games failed:', error);
        throw error;
    }
}
