import { positions, progress, analysisQueue } from '$lib/store';
import { get } from 'svelte/store';
import StockfishWorker from '$lib/workers/stockfish.worker?worker';

let worker: Worker | null = null;
let isAnalyzing = false;

// Initialize worker
function initWorker() {
    if (worker) return;

    // Vite handles ?worker import correctly
    worker = new StockfishWorker();

    worker.onmessage = (event) => {
        const { type, fen, bestMove, score } = event.data;

        if (type === 'result') {
            // Update position map
            positions.update(map => {
                const node = map.get(fen);
                if (node) {
                    node.engineEval = {
                        bestMove,
                        depth: 14, // Hardcoded for now or passed back
                        cp: score // if available
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
}

export async function startAnalysis() {
    if (isAnalyzing) return;
    initWorker();
    isAnalyzing = true;
    processNext();
}

function processNext() {
    const queue = get(analysisQueue);

    if (queue.length === 0) {
        isAnalyzing = false;
        return;
    }

    // Take one item
    // Note: This is simple FIFO.
    // Ideally, prioritize by frequency or importance.
    const fen = queue[0];

    // Remove from queue in store
    analysisQueue.update(q => q.slice(1));

    if (worker) {
        // Send to worker
        worker.postMessage({
            type: 'analyze',
            fen,
            depth: 14 // Analysis depth
        });
    }
}

export function stopAnalysis() {
    isAnalyzing = false;
    if (worker) {
        worker.terminate();
        worker = null;
    }
}
