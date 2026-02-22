import { fetchLichessGames } from '$lib/clients/lichess';
import { processGames } from '$lib/chess/analysis';
import { games, positions, isScanning, progress, user, analysisQueue, openings } from '$lib/store';
import { startAnalysis, stopAnalysis } from '$lib/chess/engine';
import type { ChessPlatform } from '$lib/types';

let scanController: AbortController | null = null;

export function stopScan() {
    if (scanController) {
        scanController.abort();
        scanController = null;
    }
    stopAnalysis();
    isScanning.set(false);
}

export async function startScan(targetUsername: string, platform: ChessPlatform = 'lichess', perfType?: string, limit: number = 100) {
    if (!targetUsername) return;

    if (scanController) {
        scanController.abort();
    }
    scanController = new AbortController();

    isScanning.set(true);
    progress.set({ fetched: 0, analyzed: 0, total: 0, analyzeTotal: 0 });
    games.set([]);
    positions.set(new Map());
    openings.set(new Map());

    user.set({ username: targetUsername, platform: 'lichess' });

    try {
        const options = { username: targetUsername, limit, perfType, signal: scanController.signal };

        // Only Lichess supported now
        const fetchedGames = await fetchLichessGames(options, (count) => {
            progress.update(p => ({ ...p, fetched: count }));
        });

        games.set(fetchedGames);
        progress.update(p => ({ ...p, fetched: fetchedGames.length }));

        // Phase 3: Extract FENs and Openings
        const { positionMap, openingStats } = processGames(fetchedGames);
        positions.set(positionMap);
        openings.set(openingStats);

        // Filter for analysis: freq >= 3
        const analysisCandidates = Array.from(positionMap.values())
            .filter(node => node.playCount >= 3)
            .map(node => node.fen);

        progress.update(p => ({ ...p, analyzeTotal: analysisCandidates.length }));

        // Populate Queue
        analysisQueue.set(analysisCandidates);

        console.log(`Initial analysis found ${analysisCandidates.length} positions to analyze.`);

        // Start engine analysis
        startAnalysis();

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Scan aborted');
        } else {
            console.error('Scan failed:', error);
            alert(`Error fetching games: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } finally {
        if (scanController?.signal.aborted === false) {
            scanController = null;
        }
        isScanning.set(false);
    }
}
