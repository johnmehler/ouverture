/// <reference lib="webworker" />

// Stockfish evaluation worker for game review
// Fetches stockfish.js as a blob, creates a child worker from it, proxies UCI

let sfWorker: Worker | null = null;
let currentIndex = -1;
let bestScore: number | null = null;
let pendingMessages: { type: string; fen: string; index: number; depth: number }[] = [];
let isReady = false;

function handleSfLine(line: string) {
    if (line.startsWith('info') && line.includes('score')) {
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (cpMatch) {
            bestScore = parseInt(cpMatch[1]) / 100;
        } else if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            bestScore = mateIn > 0 ? 100 : -100;
        }
    }

    if (line.startsWith('bestmove')) {
        self.postMessage({
            type: 'eval-result',
            index: currentIndex,
            score: bestScore ?? 0
        });
        bestScore = null;
    }

    if (line === 'uciok') {
        sfWorker?.postMessage('isready');
    }
    if (line === 'readyok') {
        isReady = true;
        self.postMessage({ type: 'ready' });
        // Process any queued messages
        for (const msg of pendingMessages) {
            processEval(msg);
        }
        pendingMessages = [];
    }
}

function processEval(data: { type: string; fen: string; index: number; depth: number }) {
    if (data.type === 'evaluate' && sfWorker) {
        currentIndex = data.index;
        bestScore = null;
        sfWorker.postMessage(`position fen ${data.fen}`);
        sfWorker.postMessage(`go depth ${data.depth || 12}`);
    }
}

// Init: fetch stockfish.js and create a worker from blob
async function init() {
    try {
        const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js');
        const text = await resp.text();
        const blob = new Blob([text], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        sfWorker = new Worker(blobUrl);
        sfWorker.onmessage = (e) => handleSfLine(typeof e.data === 'string' ? e.data : String(e.data));
        sfWorker.onerror = (e) => {
            console.error('Stockfish sub-worker error:', e);
            self.postMessage({ type: 'ready' });
        };

        // Start UCI handshake
        sfWorker.postMessage('uci');
    } catch (e) {
        console.error('Failed to init Stockfish:', e);
        self.postMessage({ type: 'ready' });
    }
}

init();

self.onmessage = (e) => {
    const data = e.data;
    if (!isReady) {
        pendingMessages.push(data);
    } else {
        processEval(data);
    }
};
