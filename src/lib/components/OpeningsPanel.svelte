<script lang="ts">
    import { openings, games } from "$lib/store";
    import { derived } from "svelte/store";
    import GameList from "$lib/components/GameList.svelte";
    import type { OpeningStats } from "$lib/chess/analysis";

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

    let selectedOpening: OpeningStats | null = $state(null);
    let selectedGames = $derived.by(() => {
        if (!selectedOpening) return [];
        const ids = new Set([
            ...selectedOpening.asWhite.gameIds,
            ...selectedOpening.asBlack.gameIds,
        ]);
        return $games.filter((g) => ids.has(g.id));
    });

    function getWinRate(wins: number, total: number) {
        if (total === 0) return 0;
        return Math.round((wins / total) * 100);
    }

    function selectOpening(op: OpeningStats) {
        selectedOpening = op;
    }

    function closeList() {
        selectedOpening = null;
    }
</script>

{#if $topOpenings.length > 0}
    <div class="openings-panel card">
        <h3>Top Openings</h3>

        <div class="openings-list">
            {#each $topOpenings as op}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="opening-item" onclick={() => selectOpening(op)}>
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

{#if selectedOpening}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={closeList}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <GameList
                games={selectedGames}
                title={selectedOpening.name}
                onClose={closeList}
            />
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
        cursor: pointer;
        padding: 0.75rem;
        margin: -0.5rem;
        border-radius: var(--radius-sm);
        transition: background 0.15s ease;
    }

    .opening-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .opening-item:last-child {
        border-bottom: none;
        padding-bottom: 0.75rem;
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
        background: var(--color-secondary);
        border-radius: 3px;
    }

    .win-rate {
        width: 50px;
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: var(--color-text-main);
    }

    /* Modal */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    .modal-content {
        background: var(--color-surface);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 900px;
        max-height: 80vh;
        overflow-y: auto;
    }
</style>
