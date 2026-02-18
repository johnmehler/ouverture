<script lang="ts">
    import Scanner from "$lib/components/Scanner.svelte";
    import Dashboard from "$lib/components/Dashboard.svelte";
    import GameReview from "$lib/components/GameReview.svelte";
    import OpeningsPanel from "$lib/components/OpeningsPanel.svelte";
    import { positions, isScanning, progress, selectedGame } from "$lib/store";
    import { fade, fly } from "svelte/transition";

    let hasStarted = $derived(
        $isScanning || $progress.total > 0 || $positions.size > 0,
    );
</script>

<div class="app-wrapper" class:hero-mode={!hasStarted}>
    <header class="navbar">
        <h1 class="logo">Ouverture</h1>
    </header>

    <main
        class="container"
        class:main-grid={hasStarted}
        class:main-grid-full={hasStarted && !!$selectedGame}
        class:hero-container={!hasStarted}
    >
        <div class="main-content" class:w-full={!hasStarted}>
            {#if !hasStarted}
                <div class="hero-text" transition:fade>
                    <p class="subtitle">
                        A chess trainer based on your online games
                    </p>
                </div>
            {/if}

            <Scanner variant={hasStarted ? "default" : "hero"} />

            {#if hasStarted}
                <div in:fly={{ y: 20, duration: 600, delay: 300 }}>
                    {#if $selectedGame}
                        <GameReview />
                    {:else}
                        <Dashboard />
                    {/if}
                </div>
            {/if}
        </div>

        {#if hasStarted && !$selectedGame}
            <aside
                class="sidebar"
                in:fly={{ x: 20, duration: 600, delay: 400 }}
            >
                {#if $isScanning}
                    <div class="skeleton-panel card">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-list">
                            {#each Array(5) as _}
                                <div class="skeleton-item">
                                    <div class="skeleton-row"></div>
                                    <div class="skeleton-bars"></div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {:else if $positions.size > 0}
                    <div in:fade>
                        <OpeningsPanel />
                    </div>
                {/if}
            </aside>
        {/if}
    </main>

    {#if $positions.size > 0}
        <footer in:fade>
            <p>Powered by Stockfish 16 (WASM) • Client-side Analysis</p>
        </footer>
    {/if}
</div>

<style>
    .app-wrapper {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        padding-top: 5rem;
        gap: 2rem;
        position: relative;
        transition: all 0.5s ease;
    }

    .app-wrapper.hero-mode {
        justify-content: center;
        padding-top: 0;
    }

    .navbar {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        padding: 1.5rem 2rem;
        z-index: 10;
    }

    .logo {
        font-size: 1.8rem;
        margin: 0;
        color: var(--color-primary);
        width: fit-content;
    }

    /* Grid Layout (Active — dashboard with sidebar) */
    .main-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
        width: 100%;
        transition:
            grid-template-columns 0.5s ease,
            max-width 0.5s ease;
    }

    @media (min-width: 1024px) {
        .main-grid {
            grid-template-columns: 1fr 320px;
        }
    }

    /* Full-width centered layout (game review, no sidebar) */
    .main-grid.main-grid-full {
        grid-template-columns: 1fr;
        max-width: 960px;
        margin-left: auto;
        margin-right: auto;
    }

    /* Hero Layout (Initial) */
    .hero-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
    }

    .hero-text {
        text-align: center;
        margin-bottom: 2rem;
    }

    .subtitle {
        font-size: 1.5rem;
        opacity: 0.9;
        font-weight: 300;
    }

    .main-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .main-content.w-full {
        width: 100%;
        align-items: center;
    }

    .sidebar {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    footer {
        padding: 2rem;
        text-align: center;
        font-size: 0.9rem;
        opacity: 0.5;
        margin-top: auto;
    }

    /* Skeleton Loader */
    .skeleton-panel {
        padding: 1.5rem;
        background: rgba(20, 20, 30, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .skeleton-title {
        height: 1.5rem;
        width: 60%;
        background: rgba(255, 255, 255, 0.05);
        margin-bottom: 2rem;
        border-radius: 4px;
        animation: pulse 1.5s infinite ease-in-out;
    }

    .skeleton-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .skeleton-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .skeleton-row {
        height: 1rem;
        width: 80%;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        animation: pulse 1.5s infinite ease-in-out;
    }

    .skeleton-bars {
        height: 0.8rem;
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        animation: pulse 1.5s infinite ease-in-out;
        animation-delay: 0.2s;
    }

    @keyframes pulse {
        0% {
            opacity: 0.3;
        }
        50% {
            opacity: 0.6;
        }
        100% {
            opacity: 0.3;
        }
    }
</style>
