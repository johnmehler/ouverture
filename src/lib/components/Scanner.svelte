<script lang="ts">
    import { startScan } from "$lib/chess/game";
    import { isScanning, progress, user } from "$lib/store";
    import { Search, Loader2 } from "lucide-svelte";

    let username = $state("");
    const platform = "lichess";

    // Time controls state
    let timeControls = $state({
        bullet: false,
        blitz: true,
        rapid: true,
        classical: false,
    });

    // Game count options
    const gameLimitOptions = [25, 50, 100, 200, 300] as const;
    let gameLimit = $state<number>(100);

    async function handleScan() {
        if (!username) return;

        // Get selected perfTypes
        const selected = Object.entries(timeControls)
            .filter(([_, enabled]) => enabled)
            .map(([type]) => type)
            .join(",");

        // If none selected, default to blitz/rapid
        const perfType = selected || "blitz,rapid";

        await startScan(username, platform, perfType, gameLimit);
    }

    // eslint-disable-next-line
    let { variant = "default" }: { variant?: "hero" | "default" } = $props();
</script>

<div class="scanner-container glass" class:hero={variant === "hero"}>
    <div class="input-group">
        <input
            type="text"
            bind:value={username}
            placeholder="Lichess Username"
            class="username-input"
        />

        <div class="time-controls">
            {#each Object.keys(timeControls) as key}
                {@const tc = key as keyof typeof timeControls}
                <label class="tc-checkbox" class:active={timeControls[tc]}>
                    <input type="checkbox" bind:checked={timeControls[tc]} />
                    {tc.charAt(0).toUpperCase() + tc.slice(1)}
                </label>
            {/each}
        </div>

        <div class="game-limit-section">
            <span class="limit-label">Games to import</span>
            <div class="limit-options">
                {#each gameLimitOptions as opt}
                    <button
                        class="limit-btn"
                        class:active={gameLimit === opt}
                        onclick={() => (gameLimit = opt)}
                    >
                        {opt}
                    </button>
                {/each}
            </div>
        </div>

        <button
            class="btn btn-primary w-full"
            onclick={handleScan}
            disabled={$isScanning}
        >
            {#if $isScanning}
                <Loader2 class="animate-spin mr-2" size={20} />
                Scanning...
            {:else}
                <Search class="mr-2" size={20} />
                Analyze {gameLimit} Games
            {/if}
        </button>
    </div>

    {#if $isScanning || $progress.total > 0}
        <div class="progress-container">
            <div class="status-message">
                {#if $isScanning}
                    Fetching games... {$progress.fetched} / {gameLimit}
                {:else}
                    Analysis Complete
                {/if}
            </div>
            {#if $isScanning}
                <div class="progress-bar">
                    <div
                        class="progress-fill"
                        style="width: {($progress.fetched / gameLimit) * 100}%"
                    ></div>
                </div>
            {/if}

            {#if !$isScanning && $progress.analyzeTotal > 0}
                <div class="result-stat">
                    <span>{$progress.analyzeTotal} Positions Analyzed</span>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .scanner-container {
        padding: 2rem;
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        gap: 1.5rem;

        /* Default State (in grid) */
        width: 100%;
        max-width: 100%;
        aspect-ratio: auto; /* Allow flexible height */

        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(20, 20, 30, 0.6);
    }

    /* Hero State (Centered, Large) */
    .scanner-container.hero {
        padding: 3rem 3rem;
        max-width: 500px;
        margin: 0 auto;

        border: 2px solid #c0c0c0;
        box-shadow: 0 0 30px rgba(192, 192, 192, 0.15);
        background: rgba(20, 20, 30, 0.9);
    }

    .input-group {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
    }

    .username-input {
        width: 100%;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 1.1rem;
        outline: none;
        transition: all 0.2s;
        text-align: center;
    }

    .hero .username-input {
        font-size: 1.5rem;
        padding: 1.2rem 2rem;
    }

    .username-input:focus {
        border-color: #c0c0c0;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 0 15px rgba(192, 192, 192, 0.3);
    }

    .hero .btn {
        font-size: 1.2rem;
        padding: 1rem;
    }

    /* Game limit selector */
    .game-limit-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .limit-label {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .limit-options {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
        justify-content: center;
    }

    .limit-btn {
        padding: 0.35rem 0.85rem;
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--color-text-muted);
        cursor: pointer;
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        transition: all 0.15s;
    }

    .limit-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
    }

    .limit-btn.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
    }

    .hero .limit-label {
        font-size: 0.9rem;
    }

    .hero .limit-btn {
        padding: 0.5rem 1.1rem;
        font-size: 1rem;
    }

    .progress-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        margin-top: auto;
    }

    .status-message {
        text-align: center;
        font-size: 0.9rem;
        color: var(--color-text-muted);
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
        transition: width 0.2s ease;
    }

    .result-stat {
        text-align: center;
        font-weight: 600;
        color: var(--color-text-main);
    }

    .time-controls {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: center;
    }

    .tc-checkbox {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.4rem 0.8rem;
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        font-size: 0.85rem;
        user-select: none;
        transition: all 0.2s;
    }

    .tc-checkbox input {
        display: none;
    }

    .tc-checkbox:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .tc-checkbox.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
    }

    .hero .time-controls {
        gap: 1rem;
    }

    .hero .tc-checkbox {
        padding: 0.6rem 1.2rem;
        font-size: 1rem;
    }
</style>
