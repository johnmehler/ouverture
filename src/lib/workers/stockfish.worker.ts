/// <reference lib="webworker" />

// Stockfish worker — fetches stockfish.js from CDN as a blob,
// spawns an inner classic worker, and proxies commands.

const SF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js';

let sfWorker: Worker | null = null;
let currentFen = '';

async function initEngine() {
    const resp = await fetch(SF_URL);
    const text = await resp.text();
    const blob = new Blob([text], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    sfWorker = new Worker(url);

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

        if (line.startsWith('info') && line.includes('score')) {
            // Could parse and forward score info here if needed
        }
    };

    sfWorker.postMessage('uci');
}

self.onmessage = async (e) => {
    const { type, fen, depth } = e.data;

    if (type === 'init') {
        await initEngine();
        return;
    }

    if (type === 'analyze') {
        if (!sfWorker) {
            await initEngine();
        }
        currentFen = fen;
        sfWorker!.postMessage(`position fen ${fen}`);
        sfWorker!.postMessage(`go depth ${depth || 14}`);
    }
};
