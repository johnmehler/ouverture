<script lang="ts">
    import type { Game } from "$lib/types";
    import { X } from "lucide-svelte";

    let {
        games,
        title,
        onClose,
    }: { games: Game[]; title: string; onClose: () => void } = $props();

    function resultLabel(game: Game): string {
        const isWhite = game.playerColor === "white";
        if (game.result === "1/2-1/2") return "½-½";
        if (
            (game.result === "1-0" && isWhite) ||
            (game.result === "0-1" && !isWhite)
        )
            return "Won";
        return "Lost";
    }

    function resultClass(game: Game): string {
        const label = resultLabel(game);
        if (label === "Won") return "result-win";
        if (label === "Lost") return "result-loss";
        return "result-draw";
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
</script>

<div class="game-list-container">
    <div class="game-list-header">
        <h3>{title}</h3>
        <span class="game-count"
            >{games.length} game{games.length !== 1 ? "s" : ""}</span
        >
        <button class="close-btn" onclick={onClose}>
            <X size={20} />
        </button>
    </div>

    <div class="game-list">
        {#each games as game}
            <a
                href={game.url}
                target="_blank"
                rel="noopener noreferrer"
                class="game-card"
            >
                <div class="game-players">
                    <div class="player-row">
                        <span class="piece-icon"
                            >{game.playerColor === "white" ? "♔" : "♚"}</span
                        >
                        <span class="player-name you">You</span>
                        <span class="player-rating">({game.myRating})</span>
                    </div>
                    <div class="vs">vs</div>
                    <div class="player-row">
                        <span class="piece-icon"
                            >{game.playerColor === "white" ? "♚" : "♔"}</span
                        >
                        <span class="player-name">{game.opponentName}</span>
                        <span class="player-rating"
                            >({game.opponentRating})</span
                        >
                    </div>
                </div>

                <div class="game-meta">
                    <span class="game-result {resultClass(game)}"
                        >{resultLabel(game)}</span
                    >
                    <span class="game-date">{formatDate(game.date)}</span>
                </div>
            </a>
        {/each}
    </div>
</div>

<style>
    .game-list-container {
        padding: 1.5rem;
    }

    .game-list-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .game-list-header h3 {
        font-size: 1.2rem;
        color: var(--color-text-main);
        margin: 0;
        flex: 1;
    }

    .game-count {
        font-size: 0.85rem;
        color: var(--color-text-muted);
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: color 0.15s;
    }

    .close-btn:hover {
        color: var(--color-text-main);
    }

    .game-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .game-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: var(--radius-md);
        text-decoration: none;
        color: inherit;
        transition:
            background 0.15s,
            border-color 0.15s;
    }

    .game-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.12);
    }

    .game-players {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .player-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .piece-icon {
        font-size: 1.1rem;
    }

    .player-name {
        font-size: 0.95rem;
        color: var(--color-text-main);
    }

    .player-name.you {
        font-weight: 600;
    }

    .player-rating {
        font-size: 0.8rem;
        color: var(--color-text-muted);
    }

    .vs {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .game-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
    }

    .game-result {
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
    }

    .result-win {
        color: #4ade80;
        background: rgba(74, 222, 128, 0.1);
    }

    .result-loss {
        color: #f87171;
        background: rgba(248, 113, 113, 0.1);
    }

    .result-draw {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
    }

    .game-date {
        font-size: 0.75rem;
        color: var(--color-text-muted);
    }
</style>
