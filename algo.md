# Algorithm: Profile Load & Analysis

This document explains the technical flow of how **Ouverture** analyzes a user's chess performance when a profile is scanned.

## 1. Data Collection (Lichess API)
- **Source**: Lichess user games API (`/api/games/user/{username}`).
- **Parameters**:
  - `max`: 300 (Fetch the most recent 300 games).
  - `opening`: `true` (Includes opening info).
  - `perfType`: blitz, rapid, classical, bullet.
- **Format**: NDJSON (Newline Delimited JSON) stream.
- **Parsing**: The app streams the response, parsing each line into a normalized `Game` object containing the PGN, color played (`white`/`black`), and result.

## 2. PGN Processing (Main Thread)
Once games are fetched, they are processed synchronously in the browser main thread (using `chess.js`).

### Step 2.1: Replay & FEN Extraction
For every game:
1.  The PGN is loaded into a chess engine state.
2.  The game is replayed move-by-move up to **12 moves** (`MAX_PLY = 24`).
3.  **Turn Detection**: At each step, the algorithm checks if it is the **User's turn**.
    - If the user is White, it records positions before White moves.
    - If the user is Black, it records positions before Black moves.

### Step 2.2: Position Aggregation
A global `Map<string, PositionNode>` is built, keyed by the standard **FEN string** (normalized to include pieces, turn, castling rights, and en passant).

For each detected position:
- **Play Count**: Incremented by 1.
- **User Moves**: The specific move made by the user (e.g., `e4`, `Nf3`) is recorded and counted.

## 3. Candidate Selection
After processing all games, the system filters the results to identify "meaningful" patterns.

- **Threshold**: Positions are only selected for deeper analysis if they have occurred **3 or more times** (`frequency >= 3`).
- **Queueing**: These FEN strings are pushed into an analysis queue (`analysisQueue`).

## 4. Engine Analysis (Web Worker)
To prevent freezing the UI, heavy computation is offloaded to a Web Worker.

- **Engine**: Stockfish 16 (WASM via `stockfish.js`).
- **Flow**:
  1.  The main thread acts as a manager, popping one FEN from the queue at a time.
  2.  The FEN is sent to the worker via `postMessage`.
  3.  The worker commands Stockfish to analyze the position:
      - Command: `position fen {fen}`
      - Command: `go depth 14`
  4.  Stockfish calculates the best move and evaluation (centipawns).
  5.  The result (`bestMove`, `score`) is sent back to the main thread.
  6.  The `positions` store is updated with the engine's evaluation.
  7.  The manager processes the next FEN in the queue.

## 5. Result Presentation
The Dashboard subscribes to the `positions` store and updates in real-time as analysis completes.

- **Sorting**: Positions are sorted by frequency (descending).
- **Display**: 
  - A board preview of the position.
  - The frequency of occurrence.
  - The user's move distribution (e.g., "e4: 80%, d4: 20%").
  - (Pending UI update) The engine's suggested best move vs. the user's choices.
