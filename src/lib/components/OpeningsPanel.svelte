<script lang="ts">
    import { openings } from "$lib/store";
    import { derived } from "svelte/store";

    // Get top 10 openings sorted by total games played
    const topOpenings = derived(openings, ($ops) => {
        return Array.from($ops.values())
            .sort(
                (a, b) =>
                    b.asWhite.games +
                    b.asBlack.games -
                    (a.asWhite.games + a.asBlack.games),
            )
            .slice(0, 10);
    });

    function getWinRate(wins: number, total: number) {
        if (total === 0) return 0;
        return Math.round((wins / total) * 100);
    }
</script>

{#if $topOpenings.length > 0}
    <div class="openings-panel card">
        <h3>Top Openings</h3>

        <div class="openings-list">
            {#each $topOpenings as op}
                <div class="opening-item">
                    <div class="opening-header">
                        <span class="opening-name">{op.name}</span>
                        <span class="total-games"
                            >{op.asWhite.games + op.asBlack.games} games</span
                        >
                    </div>

                    <div class="stat-bars">
                        {#if op.asWhite.games > 0}
                            <div class="stat-row">
                                <span class="color-label">White</span>
                                <div class="bar-container">
                                    <div
                                        class="bar-fill win"
                                        style="width: {getWinRate(
                                            op.asWhite.wins,
                                            op.asWhite.games,
                                        )}%"
                                    ></div>
                                </div>
                                <span class="win-rate"
                                    >{getWinRate(
                                        op.asWhite.wins,
                                        op.asWhite.games,
                                    )}% WR</span
                                >
                            </div>
                        {/if}

                        {#if op.asBlack.games > 0}
                            <div class="stat-row">
                                <span class="color-label">Black</span>
                                <div class="bar-container">
                                    <div
                                        class="bar-fill win"
                                        style="width: {getWinRate(
                                            op.asBlack.wins,
                                            op.asBlack.games,
                                        )}%"
                                    ></div>
                                </div>
                                <span class="win-rate"
                                    >{getWinRate(
                                        op.asBlack.wins,
                                        op.asBlack.games,
                                    )}% WR</span
                                >
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .openings-panel {
        background: rgba(20, 20, 30, 0.6);
        max-height: fit-content;
    }

    h3 {
        margin-bottom: 1rem;
        font-size: 1.2rem;
        color: var(--color-primary);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0.5rem;
    }

    .openings-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .opening-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .opening-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }

    .opening-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }

    .opening-name {
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--color-text-main);
    }

    .total-games {
        font-size: 0.8rem;
        color: var(--color-text-muted);
    }

    .stat-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
    }

    .color-label {
        width: 40px;
        color: var(--color-text-muted);
    }

    .bar-container {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        background: var(--color-secondary); /* or green for wins? */
        border-radius: 3px;
    }

    .win-rate {
        width: 50px;
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: var(--color-text-main);
    }
</style>
