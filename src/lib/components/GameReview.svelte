<script lang="ts">
    import {
        selectedGame,
        gameMistakes,
        isAnalyzingGame,
        gameAnalysisProgress,
    } from "$lib/store";
    import PuzzleView from "$lib/components/PuzzleView.svelte";
    import {
        analyzeGameForMistakes,
        stopGameAnalysis,
    } from "$lib/chess/review";
    import { ArrowLeft, Loader2, Square } from "lucide-svelte";
    import { onMount } from "svelte";

    function goBack() {
        stopGameAnalysis();
        selectedGame.set(null);
        gameMistakes.set([]);
    }

    function resultLabel(): string {
        const game = $selectedGame!;
        const isWhite = game.playerColor === "white";
        if (game.result === "1/2-1/2") return "Draw";
        if (
            (game.result === "1-0" && isWhite) ||
            (game.result === "0-1" && !isWhite)
        )
            return "Won";
        return "Lost";
    }

    function resultClass(): string {
        const label = resultLabel();
        if (label === "Won") return "result-win";
        if (label === "Lost") return "result-loss";
        return "result-draw";
    }

    onMount(() => {
        if ($selectedGame) {
            analyzeGameForMistakes($selectedGame);
        }
    });
</script>

{#if $selectedGame}
    <div class="game-review">
        <button class="back-btn" onclick={goBack}>
            <ArrowLeft size={18} />
            Back to Dashboard
        </button>

        <div class="review-header card">
            <div class="players-info">
                <div class="player">
                    <span class="piece"
                        >{$selectedGame.playerColor === "white"
                            ? "♔"
                            : "♚"}</span
                    >
                    <span class="name">You</span>
                    <span class="rating">({$selectedGame.myRating})</span>
                </div>
                <span class="vs-label">vs</span>
                <div class="player">
                    <span class="piece"
                        >{$selectedGame.playerColor === "white"
                            ? "♚"
                            : "♔"}</span
                    >
                    <span class="name">{$selectedGame.opponentName}</span>
                    <span class="rating">({$selectedGame.opponentRating})</span>
                </div>
            </div>
            <div class="result-badge {resultClass()}">{resultLabel()}</div>
        </div>

        {#if $isAnalyzingGame}
            <div class="analyzing-header">
                <button class="btn btn-primary w-full analyzing-btn" disabled>
                    <Loader2 class="animate-spin mr-2" size={20} />
                    Analyzing game with Stockfish...
                </button>

                <button
                    class="stop-analysis-btn"
                    onclick={stopGameAnalysis}
                    title="Stop Analysis"
                >
                    <Square fill="currentColor" size={14} />
                    <span>Stop</span>
                </button>
            </div>

            <div class="analyzing-progress-container card">
                {#if $gameAnalysisProgress.total > 0}
                    <p class="status-message">
                        Analyzing position {$gameAnalysisProgress.current} / {$gameAnalysisProgress.total}
                    </p>
                    <div class="progress-bar">
                        <div
                            class="progress-fill"
                            style="width: {($gameAnalysisProgress.current /
                                $gameAnalysisProgress.total) *
                                100}%"
                        ></div>
                    </div>
                {:else}
                    <p class="status-message">Preparing positions...</p>
                {/if}
            </div>
        {:else if $gameMistakes.length === 0}
            <div class="no-mistakes card">
                <span class="check-icon">✓</span>
                <h3>No major mistakes found</h3>
                <p>
                    No moves where the evaluation dropped by more than 1 pawn.
                    Well played!
                </p>
            </div>
        {:else}
            <PuzzleView mistakes={$gameMistakes} />
        {/if}
    </div>
{/if}

<style>
    .game-review {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0.5rem 0;
        transition: color 0.15s;
        width: fit-content;
    }

    .back-btn:hover {
        color: var(--color-text-main);
    }

    .review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(30, 30, 40, 0.6);
    }

    .players-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .player {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .piece {
        font-size: 1.3rem;
    }

    .name {
        font-weight: 600;
        color: var(--color-text-main);
    }

    .rating {
        font-size: 0.85rem;
        color: var(--color-text-muted);
    }

    .vs-label {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        text-transform: uppercase;
    }

    .result-badge {
        font-weight: 700;
        font-size: 0.9rem;
        padding: 0.3rem 0.75rem;
        border-radius: 6px;
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

    .analyzing-header {
        position: relative;
        width: 100%;
    }

    .analyzing-btn {
        pointer-events: none;
    }

    .stop-analysis-btn {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.8rem;
        background: rgba(0, 0, 0, 0.2);
        border: none;
        border-radius: var(--radius-sm, 6px);
        color: white;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition:
            background 0.2s,
            color 0.2s;
        z-index: 10;
        pointer-events: auto;
    }

    .stop-analysis-btn:hover {
        background: rgba(220, 38, 38, 0.8);
    }

    .analyzing-progress-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.8rem;
        background: rgba(30, 30, 40, 0.6);
        padding: 1.5rem;
    }

    .status-message {
        text-align: center;
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin: 0;
    }

    .progress-bar {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: var(--color-primary);
        border-radius: 3px;
        transition: width 0.15s ease;
    }

    .no-mistakes {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 3rem;
        text-align: center;
        background: rgba(30, 30, 40, 0.6);
    }

    .check-icon {
        font-size: 2rem;
        color: #4ade80;
    }

    .no-mistakes h3 {
        color: var(--color-text-main);
        margin: 0;
    }

    .no-mistakes p {
        color: var(--color-text-muted);
        margin: 0;
    }
</style>
