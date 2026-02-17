<script lang="ts">
    import Board from "$lib/components/Board.svelte";
    import type { Mistake } from "$lib/store";
    import type { Key } from "chessground/types";

    let { mistake }: { mistake: Mistake } = $props();

    function formatEval(val: number): string {
        if (val >= 100) return "#";
        if (val <= -100) return "#";
        const sign = val >= 0 ? "+" : "";
        return `${sign}${val.toFixed(1)}`;
    }
</script>

<div class="mistake-card card">
    <div class="mistake-header">
        <span class="move-number">Move {mistake.moveNumber}</span>
        <span class="eval-drop">−{mistake.evalDrop.toFixed(1)}</span>
    </div>

    <div class="board-preview">
        <Board
            fen={mistake.fen}
            orientation={mistake.playerColor}
            config={{
                drawable: {
                    enabled: false,
                    visible: true,
                    autoShapes: [
                        {
                            orig: mistake.userMoveLan.slice(0, 2) as Key,
                            dest: mistake.userMoveLan.slice(2, 4) as Key,
                            brush: "red",
                        },
                    ],
                },
            }}
        />
    </div>

    <div class="mistake-info">
        <div class="move-row">
            <span class="label">Your move</span>
            <span class="user-move">{mistake.userMove}</span>
        </div>
        <div class="eval-row">
            <div class="eval-chip before">
                <span class="eval-label">Before</span>
                <span class="eval-value">{formatEval(mistake.evalBefore)}</span>
            </div>
            <span class="eval-arrow">→</span>
            <div class="eval-chip after">
                <span class="eval-label">After</span>
                <span class="eval-value">{formatEval(mistake.evalAfter)}</span>
            </div>
        </div>
    </div>
</div>

<style>
    .mistake-card {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        background: rgba(30, 30, 40, 0.6);
    }

    .mistake-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .move-number {
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--color-text-main);
    }

    .eval-drop {
        font-weight: 700;
        font-size: 0.9rem;
        color: #f87171;
        background: rgba(248, 113, 113, 0.1);
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
    }

    .board-preview {
        width: 100%;
        aspect-ratio: 1;
        pointer-events: none;
    }

    .mistake-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .move-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .label {
        font-size: 0.8rem;
        color: var(--color-text-muted);
    }

    .user-move {
        font-weight: 700;
        font-size: 1rem;
        color: #f87171;
        font-family: "Courier New", monospace;
    }

    .eval-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
    }

    .eval-chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.3rem 0.6rem;
        border-radius: 6px;
        min-width: 60px;
    }

    .eval-chip.before {
        background: rgba(255, 255, 255, 0.05);
    }

    .eval-chip.after {
        background: rgba(248, 113, 113, 0.1);
    }

    .eval-label {
        font-size: 0.65rem;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .eval-value {
        font-weight: 700;
        font-size: 0.9rem;
        font-variant-numeric: tabular-nums;
    }

    .eval-arrow {
        color: var(--color-text-muted);
        font-size: 1.1rem;
    }
</style>
