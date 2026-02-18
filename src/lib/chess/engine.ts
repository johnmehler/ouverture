import { positions, progress, analysisQueue } from '$lib/store';
import { get } from 'svelte/store';
import StockfishWorker from '$lib/workers/stockfish.worker?worker';

let worker: Worker | null = null;
let isAnalyzing = false;
let workerReady = false;
let pendingStart = false;

// Initialize worker
function initWorker() {
    if (worker) return;

    worker = new StockfishWorker();

    worker.onmessage = (event) => {
        const { type, fen, bestMove } = event.data;

        if (type === 'ready') {
            workerReady = true;
            if (pendingStart) {
                pendingStart = false;
                processNext();
            }
            return;
        }

        if (type === 'result') {
            // Update position map
            positions.update(map => {
                const node = map.get(fen);
                if (node) {
                    node.engineEval = {
                        bestMove,
                        depth: 14,
                        cp: undefined
                    };
                }
                return map;
            });

            // Update progress
            progress.update(p => ({
                ...p,
                analyzed: p.analyzed + 1
            }));

            // Continue processing
            processNext();
        }
    };

    // Kick off initialization (fetch stockfish from CDN)
    worker.postMessage({ type: 'init' });
}

export async function startAnalysis() {
    if (isAnalyzing) return;
    isAnalyzing = true;
    initWorker();

    if (workerReady) {
        processNext();
    } else {
        pendingStart = true;
    }
}

function processNext() {
    const queue = get(analysisQueue);

    if (queue.length === 0) {
        isAnalyzing = false;
        return;
    }

    const fen = queue[0];
    analysisQueue.update(q => q.slice(1));

    if (worker && workerReady) {
        worker.postMessage({
            type: 'analyze',
            fen,
            depth: 14
        });
    }
}

export function stopAnalysis() {
    isAnalyzing = false;
    workerReady = false;
    pendingStart = false;
    if (worker) {
        worker.terminate();
        worker = null;
    }
}
