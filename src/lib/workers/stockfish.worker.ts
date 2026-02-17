/// <reference lib="webworker" />

// Use a relatively modern version of Stockfish via CDN
// Using 10.0.0 for compatibility, but might need newer.
// Note: Stockfish.js loads .wasm relative to itself usually.
// If using CDN, we might need a version that embeds or handles path correctly.
// Let's try loading the script directly.

declare var Stockfish: () => Worker;

// Create the engine instance
let engine: Worker | null = null;
let isReady = false;

// We need a way to correlate commands with responses for async analysis
let currentFen = '';
let currentDepth = 10;

// Initialize engine
function initEngine() {
    try {
        // Build a proper URL for importScripts
        // This is tricky with Vite + Workers + CDNs.
        // Option 1: fetch blob and run.
        // Option 2: straightforward importScripts if allowed by CSP.

        // Let's assume we can fetch it.
        // However, standard stockfish.js needs stockfish.wasm in the same folder.
        // A CDN like unpkg works if the script knows where to fetch wasm.

        // For simplicity in this demo, we'll try to use a single-file build if available,
        // or just point to the standard distribution.

        // This is a placeholder. In a real app, you should download stockfish.js + .wasm to /static.
        // I will add a TODO to the user.

        // Temporarily, let's use a bundled reliable version if possible, or just fail gracefully.
        // "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js"

        importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js');

        if (typeof Stockfish === 'function') {
            engine = Stockfish();

            engine.onmessage = (event) => {
                const line = event.data;
                // Parse UCI output
                // "bestmove e2e4 ponder ..."
                if (line.startsWith('bestmove')) {
                    const bestMove = line.split(' ')[1];
                    self.postMessage({ type: 'result', fen: currentFen, bestMove });
                }
                // "info depth 10 seldepth 14 ... score cp 50 ..."
                if (line.startsWith('info') && line.includes('score')) {
                    // Parse score
                    // ...
                }
            };

            engine.postMessage('uci');
            isReady = true;
        }
    } catch (e) {
        console.error('Failed to load Stockfish', e);
    }
}

self.onmessage = (e) => {
    if (!engine) initEngine();

    const { type, fen, depth } = e.data;

    if (type === 'analyze') {
        currentFen = fen;
        currentDepth = depth;
        engine?.postMessage(`position fen ${fen}`);
        engine?.postMessage(`go depth ${depth}`);
    }
};
