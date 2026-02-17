import type { Game, FetchOptions } from '$lib/types';

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
                    const whiteName = data.players?.white?.user?.name || 'Anonymous';
                    const blackName = data.players?.black?.user?.name || 'Anonymous';
                    const isWhite = whiteName.toLowerCase() === username.toLowerCase();

                    if (!data.id) continue;

                    games.push({
                        id: data.id,
                        platform: 'lichess',
                        pgn: data.pgn || '',
                        white: whiteName,
                        black: blackName,
                        date: new Date(data.createdAt).toISOString(),
                        url: `https://lichess.org/${data.id}`,
                        result: data.winner ? (data.winner === 'white' ? '1-0' : '0-1') : '1/2-1/2',
                        playerColor: isWhite ? 'white' : 'black',
                        myRating: isWhite ? data.players?.white?.rating : data.players?.black?.rating,
                        opponentName: isWhite ? blackName : whiteName,
                        opponentRating: isWhite ? data.players?.black?.rating : data.players?.white?.rating,
                        moves: [] as string[]
                    });

                    if (onProgress) {
                        onProgress(games.length);
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
                // Simple duplication for the final chunk just to be safe
                const whiteName = data.players?.white?.user?.name || 'Anonymous';
                const blackName = data.players?.black?.user?.name || 'Anonymous';
                const isWhite = whiteName.toLowerCase() === username.toLowerCase();

                if (data.id) {
                    games.push({
                        id: data.id,
                        platform: 'lichess',
                        pgn: data.pgn || '',
                        white: whiteName,
                        black: blackName,
                        date: new Date(data.createdAt).toISOString(),
                        url: `https://lichess.org/${data.id}`,
                        result: data.winner ? (data.winner === 'white' ? '1-0' : '0-1') : '1/2-1/2',
                        playerColor: isWhite ? 'white' : 'black',
                        myRating: isWhite ? data.players?.white?.rating : data.players?.black?.rating,
                        opponentName: isWhite ? blackName : whiteName,
                        opponentRating: isWhite ? data.players?.black?.rating : data.players?.white?.rating,
                        moves: []
                    });
                }
            } catch (e) {
                // Ignore
            }
        }

        return games;

    } catch (error) {
        console.error('Fetch Lichess games failed:', error);
        throw error;
    }
}
