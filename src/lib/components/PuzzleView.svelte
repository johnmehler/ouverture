<script lang="ts">
    import PuzzleBoard from "$lib/components/PuzzleBoard.svelte";
    import type { Mistake } from "$lib/store";
    import {
        ChevronLeft,
        ChevronRight,
        Check,
        X,
        RotateCcw,
    } from "lucide-svelte";

    interface Props {
        mistakes: Mistake[];
    }

    let { mistakes }: Props = $props();

    let currentIndex = $state(0);
    let puzzle = $derived(mistakes[currentIndex]);
    let feedback = $state<"correct" | "incorrect" | "best" | null>(null);
    let solved = $state<boolean[]>(new Array(mistakes.length).fill(false));
    let moveHistory = $state<{ san: string; color: "w" | "b" }[]>([]);
    let showingAnswer = $state(false);
    let boardFen = $state(mistakes[0]?.fen ?? "start");
    let pendingMove = $state<{
        from: string;
        to: string;
        promotion?: string;
    } | null>(null);
    let boardInteractive = $derived(
        !showingAnswer && feedback !== "best" && feedback !== "correct",
    );

    function goTo(idx: number) {
        if (idx < 0 || idx >= mistakes.length) return;
        currentIndex = idx;
        feedback = null;
        moveHistory = [];
        showingAnswer = false;
        pendingMove = null;
        boardFen = mistakes[idx].fen;
    }

    function handleUserMove(from: string, to: string, san: string) {
        const moveLan = from + to;
        const p = puzzle;

        moveHistory = [
            ...moveHistory,
            {
                san,
                color: p.playerColor === "white" ? "w" : "b",
            },
        ];

        if (moveLan === p.bestMove) {
            feedback = "best";
            solved[currentIndex] = true;
            solved = [...solved];
        } else if (p.acceptableMoves.includes(moveLan)) {
            feedback = "correct";
            solved[currentIndex] = true;
            solved = [...solved];
        } else {
            feedback = "incorrect";
        }
    }

    function retry() {
        feedback = null;
        moveHistory = [];
        showingAnswer = false;
        pendingMove = null;
        boardFen = puzzle.fen;
    }

    function showAnswer() {
        showingAnswer = true;
        feedback = null;
        if (puzzle.bestMove) {
            const from = puzzle.bestMove.slice(0, 2);
            const to = puzzle.bestMove.slice(2, 4);
            const promo =
                puzzle.bestMove.length > 4 ? puzzle.bestMove[4] : undefined;
            pendingMove = { from, to, promotion: promo };
        }
    }

    function handleMoveApplied(san: string) {
        moveHistory = [
            ...moveHistory,
            {
                san,
                color: puzzle.playerColor === "white" ? "w" : "b",
            },
        ];
        pendingMove = null;
    }

    function formatEval(val: number): string {
        if (val >= 100) return "#";
        if (val <= -100) return "#";
        const sign = val >= 0 ? "+" : "";
        return `${sign}${val.toFixed(1)}`;
    }

    let solvedCount = $derived(solved.filter(Boolean).length);
</script>

<div class="puzzle-layout">
    <!-- Main puzzle area -->
    <div class="puzzle-main">
        <div class="board-section">
            <PuzzleBoard
                fen={boardFen}
                orientation={puzzle.playerColor}
                onUserMove={handleUserMove}
                interactive={boardInteractive}
                {pendingMove}
                onMoveApplied={handleMoveApplied}
            />
        </div>

        <!-- Sidebar -->
        <div class="puzzle-sidebar card">
            <div class="puzzle-info">
                <div class="puzzle-title">
                    <span class="puzzle-label"
                        >Puzzle {currentIndex + 1} of {mistakes.length}</span
                    >
                    <span class="move-badge">Move {puzzle.moveNumber}</span>
                </div>

                <div class="puzzle-prompt">
                    <p>
                        You played <span class="bad-move"
                            >{puzzle.userMove}</span
                        > here.
                    </p>
                    <p class="eval-info">
                        Eval: {formatEval(puzzle.evalBefore)} → {formatEval(
                            puzzle.evalAfter,
                        )}
                        <span class="eval-drop-tag"
                            >({formatEval(-puzzle.evalDrop)})</span
                        >
                    </p>
                    <p class="prompt-text">
                        Find the best move for {puzzle.playerColor}.
                    </p>
                </div>
            </div>

            <!-- Move history -->
            <div class="notation-panel">
                <h4>Moves</h4>
                <div class="notation-list">
                    {#if moveHistory.length === 0}
                        <span class="notation-empty"
                            >Make a move on the board...</span
                        >
                    {:else}
                        {#each moveHistory as mv, i}
                            <span
                                class="notation-move"
                                class:white-move={mv.color === "w"}
                                class:black-move={mv.color === "b"}
                            >
                                {#if mv.color === "w"}
                                    <span class="move-num"
                                        >{puzzle.moveNumber +
                                            Math.floor(i / 2)}.</span
                                    >
                                {/if}
                                {mv.san}
                            </span>
                        {/each}
                    {/if}
                </div>
            </div>

            <!-- Feedback -->
            {#if feedback === "best"}
                <div class="feedback feedback-best">
                    <Check size={18} />
                    <span>Best move! <strong>{puzzle.bestMoveSan}</strong></span
                    >
                </div>
            {:else if feedback === "correct"}
                <div class="feedback feedback-good">
                    <Check size={18} />
                    <span
                        >Good move! Best was <strong
                            >{puzzle.bestMoveSan}</strong
                        ></span
                    >
                </div>
            {:else if feedback === "incorrect"}
                <div class="feedback feedback-wrong">
                    <X size={18} />
                    <span>Not the best move. Try again!</span>
                </div>
            {/if}

            {#if showingAnswer}
                <div class="feedback feedback-answer">
                    <span
                        >The best move was <strong>{puzzle.bestMoveSan}</strong
                        ></span
                    >
                </div>
            {/if}

            <!-- Actions -->
            <div class="puzzle-actions">
                {#if feedback === "incorrect"}
                    <button class="action-btn" onclick={retry}>
                        <RotateCcw size={16} />
                        Retry
                    </button>
                    <button class="action-btn action-show" onclick={showAnswer}>
                        Show answer
                    </button>
                {/if}
                {#if feedback === "best" || feedback === "correct" || showingAnswer}
                    {#if currentIndex < mistakes.length - 1}
                        <button
                            class="action-btn action-next"
                            onclick={() => goTo(currentIndex + 1)}
                        >
                            Next puzzle
                            <ChevronRight size={16} />
                        </button>
                    {:else}
                        <div
                            class="feedback feedback-best"
                            style="margin-top: 0.25rem"
                        >
                            <Check size={18} />
                            <span>All puzzles complete!</span>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </div>

    <!-- Bottom puzzle navigation bar -->
    <div class="puzzle-bar card">
        <button
            class="nav-btn"
            onclick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
        >
            <ChevronLeft size={18} />
        </button>

        <div class="puzzle-dots">
            {#each mistakes as _, i}
                <button
                    class="puzzle-dot"
                    class:active={i === currentIndex}
                    class:solved={solved[i]}
                    onclick={() => goTo(i)}
                    title="Puzzle {i + 1}"
                >
                    {i + 1}
                </button>
            {/each}
        </div>

        <button
            class="nav-btn"
            onclick={() => goTo(currentIndex + 1)}
            disabled={currentIndex >= mistakes.length - 1}
        >
            <ChevronRight size={18} />
        </button>

        <div class="bar-stats">
            <span class="solved-count"
                >{solvedCount}/{mistakes.length} solved</span
            >
        </div>
    </div>
</div>

<style>
    .puzzle-layout {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .puzzle-main {
        display: grid;
        grid-template-columns: minmax(300px, 500px) 1fr;
        gap: 1.5rem;
        align-items: start;
    }

    @media (max-width: 768px) {
        .puzzle-main {
            grid-template-columns: 1fr;
        }
    }

    .board-section {
        width: 100%;
    }

    /* Sidebar */
    .puzzle-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: rgba(30, 30, 40, 0.6);
        min-height: 300px;
    }

    .puzzle-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .puzzle-label {
        font-weight: 700;
        font-size: 1rem;
        color: var(--color-text-main);
    }

    .move-badge {
        font-size: 0.8rem;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--color-text-muted);
    }

    .puzzle-prompt p {
        margin: 0 0 0.25rem;
        font-size: 0.9rem;
        color: var(--color-text-muted);
    }

    .bad-move {
        font-weight: 700;
        color: #f87171;
        font-family: "Courier New", monospace;
    }

    .eval-info {
        font-size: 0.85rem !important;
    }

    .eval-drop-tag {
        color: #f87171;
        font-weight: 600;
    }

    .prompt-text {
        color: var(--color-text-main) !important;
        font-weight: 600;
        margin-top: 0.5rem !important;
    }

    /* Notation */
    .notation-panel {
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding-top: 0.75rem;
    }

    .notation-panel h4 {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-muted);
        margin-bottom: 0.5rem;
    }

    .notation-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        min-height: 2rem;
        align-items: center;
    }

    .notation-empty {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        font-style: italic;
    }

    .notation-move {
        font-size: 0.9rem;
        font-family: "Courier New", monospace;
        padding: 0.15rem 0.4rem;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.04);
    }

    .move-num {
        color: var(--color-text-muted);
        margin-right: 0.15rem;
    }

    /* Feedback */
    .feedback {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 0.8rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .feedback-best {
        background: rgba(74, 222, 128, 0.12);
        color: #4ade80;
        border: 1px solid rgba(74, 222, 128, 0.2);
    }

    .feedback-good {
        background: rgba(251, 191, 36, 0.12);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.2);
    }

    .feedback-wrong {
        background: rgba(248, 113, 113, 0.12);
        color: #f87171;
        border: 1px solid rgba(248, 113, 113, 0.2);
    }

    .feedback-answer {
        background: rgba(139, 92, 246, 0.12);
        color: var(--color-primary);
        border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .feedback strong {
        font-family: "Courier New", monospace;
    }

    /* Actions */
    .puzzle-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: auto;
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
        color: var(--color-text-main);
        font: inherit;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s;
    }

    .action-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
    }

    .action-show {
        color: var(--color-text-muted);
    }

    .action-next {
        background: var(--color-primary);
        border-color: var(--color-primary);
    }

    .action-next:hover {
        background: hsl(var(--primary-hue), var(--primary-sat), 70%);
    }

    .action-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* Bottom nav bar */
    .puzzle-bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: rgba(30, 30, 40, 0.6);
    }

    .nav-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
        color: var(--color-text-main);
        cursor: pointer;
        transition: all 0.15s;
        flex-shrink: 0;
    }

    .nav-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.08);
    }

    .nav-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .puzzle-dots {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
        flex: 1;
        justify-content: center;
    }

    .puzzle-dot {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        color: var(--color-text-muted);
        font: inherit;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .puzzle-dot:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
    }

    .puzzle-dot.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: white;
    }

    .puzzle-dot.solved {
        background: rgba(74, 222, 128, 0.15);
        border-color: rgba(74, 222, 128, 0.3);
        color: #4ade80;
    }

    .puzzle-dot.solved.active {
        background: #4ade80;
        border-color: #4ade80;
        color: #000;
    }

    .bar-stats {
        flex-shrink: 0;
    }

    .solved-count {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        font-variant-numeric: tabular-nums;
    }
</style>
