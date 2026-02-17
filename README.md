# Ouverture

**Ouverture** is a modern, client-side chess analysis tool designed to help you identify and fix recurring mistakes in your mid-game play. By analyzing your Lichess game history, it pinpoints specific positions where your win rate drops significantly, allowing you to train focused on your actual weaknesses rather than generic puzzles.

## Features

- **Personalized Analysis**: Fetches your recent games directly from Lichess.
- **Mid-Game Focus**: Analyzing moves 6-30 to target the critical transition from opening to middlegame.
- **Leak Detection**: Identifies "leaked" positions—specific board states you reach frequently but often lose from.
- **Opening Statistics**: Visual breakdown of your performance across your most common openings as both White and Black.
- **Time Control Filtering**: Select which games to include (Bullet, Blitz, Rapid, Classical).
- **100% Client-Side**: Powered by Stockfish 16 via WebAssembly (WASM). No game data is sent to any external server (other than fetching from Lichess).
- **Modern UI**: A clean, distraction-free dark interface built with Svelte 5.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/johnmehler/ouverture.git
    cd ouverture
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:5173`.

## How to Use

1.  **Enter Username**: Type your Lichess username into the scan box.
2.  **Select Time Controls**: Toggle the game types you want to analyze (e.g., Blitz, Rapid).
3.  **Analyze**: Click "Analyze Games".
4.  **Review**:
    *   **Dashboard**: Shows your "leaked" positions sorted by frequency and win rate. Click "Analyze" on any card to dive deeper.
    *   **Openings Panel**: Review your win rates for your top openings.

## Tech Stack

- **Framework**: SvelteKit (Svelte 5)
- **Chess Logic**: `chess.js`
- **Engine**: Stockfish 16 (WASM)
- **API**: Lichess API (NDJSON streaming)
- **Styling**: Vanilla CSS (CSS Variables)

## License

MIT
