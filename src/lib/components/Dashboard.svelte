<script lang="ts">
    import { positions, progress } from "$lib/store";
    import Board from "$lib/components/Board.svelte";
    import { derived } from "svelte/store";

    // Sort positions by play count, descending
    let topPositions = $derived(
        Array.from($positions.values())
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 20), // Show top 20
    );

    function formatMoveStats(userMoves: Record<string, number>, total: number) {
        return Object.entries(userMoves)
            .sort(([, a], [, b]) => b - a)
            .map(
                ([move, count]) =>
                    `${move}: ${Math.round((count / total) * 100)}% (${count})`,
            )
            .join(", ");
    }
</script>

{#if topPositions.length > 0}
    <div class="dashboard container">
        <header>
            <h2>Analysis Results</h2>
            <p>
                Found {$positions.size} unique positions from {$progress.fetched}
                games.
            </p>
        </header>

        <div class="leaks-grid">
            {#each topPositions as pos}
                <div class="leak-card card">
                    <div class="board-preview">
                        <Board fen={pos.fen} orientation="white" />
                    </div>
                    <div class="leak-info">
                        <div class="stat-row">
                            <span class="label">Frequency</span>
                            <span class="value">{pos.playCount} times</span>
                        </div>
                        <div class="moves-list">
                            <span class="label">Your Moves:</span>
                            <p>
                                {formatMoveStats(pos.userMoves, pos.playCount)}
                            </p>
                        </div>
                        <!-- Engine analysis will go here -->
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .dashboard {
        padding-bottom: 4rem;
    }

    header {
        margin-bottom: 2rem;
        text-align: center;
    }

    .leaks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
    }

    .leak-card {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: rgba(30, 30, 40, 0.6);
    }

    .board-preview {
        width: 100%;
        aspect-ratio: 1;
        pointer-events: none; /* simple preview */
    }

    .leak-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding-bottom: 0.5rem;
    }

    .moves-list p {
        font-size: 0.9rem;
        color: var(--color-text-main);
    }
</style>
