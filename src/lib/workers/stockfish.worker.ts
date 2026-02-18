/// <reference lib="webworker" />

// Stockfish worker wrapper — spawns the WASM Stockfish engine from /static
// and proxies UCI commands between the main thread and the engine.

let sfWorker: Worker | null = null;
let currentFen = '';
let basePath = '';



function initEngine(newBase?: string) {
    if (newBase !== undefined) basePath = newBase;
    // Stockfish 18 WASM (single-threaded, lite) served from /static/stockfish/
    // The .wasm file is loaded automatically by the JS relative to its own URL.
    const path = `${basePath}/stockfish/stockfish-18-lite-single.js`;
    sfWorker = new Worker(path);

    sfWorker.onmessage = (event) => {
        const line = typeof event.data === 'string' ? event.data : String(event.data);

        if (line === 'uciok') {
            sfWorker!.postMessage('isready');
        }

        if (line === 'readyok') {
            self.postMessage({ type: 'ready' });
        }

        if (line.startsWith('bestmove')) {
            const bestMove = line.split(' ')[1] || '';
            self.postMessage({ type: 'result', fen: currentFen, bestMove });
        }
    };

    sfWorker.postMessage('uci');
}

self.onmessage = (e) => {
    const { type, fen, depth, base } = e.data;

    if (type === 'init') {
        initEngine(base);
        return;
    }

    if (type === 'analyze') {
        if (!sfWorker) {
            initEngine();
        }
        currentFen = fen;
        sfWorker!.postMessage(`position fen ${fen}`);
        sfWorker!.postMessage(`go depth ${depth || 14}`);
    }
};
