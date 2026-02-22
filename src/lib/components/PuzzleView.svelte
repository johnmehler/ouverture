<script lang="ts">
    import { onMount, onDestroy, untrack } from "svelte";
    import { Chess } from "chess.js";
    import {
        ChevronLeft,
        ChevronRight,
        Check,
        X,
        RotateCcw,
        Loader2,
    } from "lucide-svelte";
    import PuzzleBoard from "$lib/components/PuzzleBoard.svelte";
    import {
        createStockfishWorker,
        evaluateSinglePosition,
    } from "$lib/chess/review";
    import EvalBar from "$lib/components/EvalBar.svelte";
    import { tick } from "svelte";
    import type { Mistake } from "$lib/store";

    interface Props {
        mistakes: Mistake[];
    }
    let { mistakes }: Props = $props();

    // --- State ---
    let currentIndex = $state(0);
    let feedback = $state<"correct" | "incorrect" | "best" | null>(null);
    let solved = $state<boolean[]>([]);
    $effect(() => {
        if (solved.length !== mistakes.length) {
            solved = new Array(mistakes.length).fill(false);
        }
    });
    let moveHistory = $state<{ san: string; color: "w" | "b" }[]>([]);
    let showingAnswer = $state(false);
    let boardKey = $state(0);
    let boardFen = $state(untrack(() => mistakes[0]?.fen ?? "start"));
    let pendingMove = $state<{
        from: string;
        to: string;
        promotion?: string;
    } | null>(null);
    let evaluating = $state(false);
    let moveEval = $state<number | null>(null);
    let otherGoodMoves = $state<{ san: string; evalScore: number }[]>([]);
    let sfWorker: Worker | null = null;

    // --- Derived ---
    const puzzle = $derived(mistakes[currentIndex]);
    const boardInteractive = $derived(
        !showingAnswer &&
            !evaluating &&
            !["best", "correct"].includes(feedback ?? ""),
    );
    const solvedCount = $derived(solved.filter(Boolean).length);

    const currentIntroMove = $derived.by(() => {
        if (showingAnswer || moveHistory.length > 0) return null;

        const p = puzzle;
        if (!p?.lastOpponentMove || !p.preMoveFen || p.preMoveFen === p.fen)
            return null;
        return {
            preMoveFen: p.preMoveFen,
            from: p.lastOpponentMove.slice(0, 2),
            to: p.lastOpponentMove.slice(2, 4),
        };
    });

    const currentAbsoluteEval = $derived(
        puzzle.playerColor === "white"
            ? moveEval !== null
                ? moveEval
                : puzzle.evalBefore
            : -(moveEval !== null ? moveEval : puzzle.evalBefore),
    );

    // --- Lifecycle ---
    onMount(async () => {
        sfWorker = await createStockfishWorker().catch(
            (e) => (console.error(e), null),
        );
    });
    onDestroy(() => sfWorker?.terminate());

    // --- Actions ---
    function goTo(idx: number) {
        if (idx < 0 || idx >= mistakes.length) return;
        currentIndex = idx;
        feedback = null;
        moveHistory = [];
        showingAnswer = false;
        pendingMove = null;
        evaluating = false;
        moveEval = null;
        otherGoodMoves = [];
        boardFen = mistakes[idx].fen;
        boardKey++;
    }

    async function handleUserMove(
        from: string,
        to: string,
        san: string,
        promotion?: string,
    ) {
        const moveLan = from + to + (promotion ?? "");
        moveHistory = [
            ...moveHistory,
            { san, color: puzzle.playerColor === "white" ? "w" : "b" },
        ];

        evaluating = true;
        let userMoveEval: number | null = null;

        if (sfWorker) {
            try {
                const tempChess = new Chess(puzzle.fen);
                tempChess.move({ from, to, promotion: promotion as any });
                const result = await evaluateSinglePosition(
                    sfWorker,
                    tempChess.fen(),
                    12,
                );
                userMoveEval = -result.score;
                moveEval = userMoveEval;
            } catch (e) {
                console.error(e);
            }
        }
        evaluating = false;

        if (moveLan === puzzle.bestMove) {
            feedback = "best";
        } else if (
            puzzle.acceptableMoves.some((m) => m.lan === moveLan) ||
            (userMoveEval !== null && puzzle.evalBefore - userMoveEval <= 0.3)
        ) {
            feedback = "correct";
        } else {
            feedback = "incorrect";
        }

        if (feedback !== "incorrect") {
            solved[currentIndex] = true;
            findAlternatives(moveLan);
        }
    }

    function findAlternatives(userMove: string) {
        const tempChess = new Chess(puzzle.fen);
        puzzle.acceptableMoves
            .filter((m) => m.lan !== userMove && m.lan !== puzzle.bestMove)
            .slice(0, 3)
            .forEach((m) => {
                const moveObj = tempChess.move({
                    from: m.lan.slice(0, 2),
                    to: m.lan.slice(2, 4),
                    promotion: m.lan[4] as any,
                });
                if (moveObj) {
                    otherGoodMoves.push({
                        san: moveObj.san,
                        evalScore: m.evalScore,
                    });
                }
                tempChess.undo();
            });
    }

    async function showAnswer() {
        showingAnswer = true;

        if (moveHistory.length > 0) {
            boardFen = puzzle.fen;
            moveHistory = [];
            boardKey++;
        }

        feedback = null;
        evaluating = false;

        if (otherGoodMoves.length === 0) {
            findAlternatives("");
        }

        // Wait for Svelte to destroy and recreate the PuzzleBoard
        await tick();

        // Let the newly mounted Chessground initialize completely before we throw the pendingMove at it
        await new Promise((r) => setTimeout(r, 100));

        const bm = puzzle.bestMove;
        pendingMove = {
            from: bm.slice(0, 2),
            to: bm.slice(2, 4),
            promotion: bm[4],
        };
    }

    const formatEval = (val: number) =>
        Math.abs(val) >= 100 ? "#" : `${val >= 0 ? "+" : ""}${val.toFixed(1)}`;

    /** Convert a user-relative eval to absolute (white-relative) convention */
    const toAbsEval = (val: number) =>
        puzzle.playerColor === "white" ? val : -val;

    const formatAbsEval = (val: number) => formatEval(toAbsEval(val));
</script>

<div class="puzzle-layout">
    <div class="puzzle-main">
        <div class="board-section">
            <div class="board-and-eval">
                <EvalBar
                    evalScore={currentAbsoluteEval}
                    orientation={puzzle.playerColor}
                />
                <div class="board-wrapper">
                    {#key boardKey}
                        <PuzzleBoard
                            fen={boardFen}
                            orientation={puzzle.playerColor}
                            onUserMove={handleUserMove}
                            interactive={boardInteractive}
                            {pendingMove}
                            onMoveApplied={(san) => {
                                moveHistory = [
                                    ...moveHistory,
                                    {
                                        san,
                                        color:
                                            puzzle.playerColor === "white"
                                                ? "w"
                                                : "b",
                                    },
                                ];
                                pendingMove = null;
                            }}
                            introMove={currentIntroMove}
                        />
                    {/key}
                </div>
            </div>
        </div>

        <aside class="puzzle-sidebar card">
            <div class="puzzle-info">
                <div class="puzzle-title">
                    <span class="puzzle-label"
                        >Puzzle {currentIndex + 1} of {mistakes.length}</span
                    >
                    <span class="move-badge">Move {puzzle.moveNumber}</span>
                </div>
                <div class="puzzle-prompt">
                    <p>
                        Played <span class="bad-move">{puzzle.userMove}</span>
                    </p>
                    <p class="eval-info">
                        Eval: {formatAbsEval(puzzle.evalBefore)} → {formatAbsEval(
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

            <div class="notation-panel">
                <h4>Moves</h4>
                <div class="notation-list">
                    {#each moveHistory as mv, i}
                        <span class="notation-move">
                            {#if mv.color === "w"}<span class="move-num"
                                    >{puzzle.moveNumber +
                                        Math.floor(i / 2)}.</span
                                >{/if}
                            {mv.san}
                        </span>
                    {:else}
                        <span class="notation-empty">Make a move...</span>
                    {/each}
                </div>
            </div>

            <div class="feedback-container">
                {#if evaluating}
                    <div class="feedback feedback-evaluating">
                        <Loader2 class="animate-spin" size={16} /> Evaluating...
                    </div>
                {:else if feedback}
                    <div
                        class="feedback feedback-{feedback === 'best'
                            ? 'best'
                            : feedback === 'correct'
                              ? 'good'
                              : 'wrong'}"
                    >
                        {#if feedback === "incorrect"}<X
                                size={18}
                            />{:else}<Check size={18} />{/if}
                        <span
                            >{feedback === "best"
                                ? "Best move!"
                                : feedback === "correct"
                                  ? "Good move!"
                                  : "Incorrect."}</span
                        >
                        {#if moveEval !== null}<span
                                class="eval-tag eval-{feedback === 'incorrect'
                                    ? 'bad'
                                    : 'good'}">{formatAbsEval(moveEval)}</span
                            >{/if}
                    </div>
                {/if}

                {#if showingAnswer || (feedback && feedback !== "incorrect")}
                    <div
                        class="feedback feedback-answer"
                        style="flex-direction: column; align-items: flex-start;"
                    >
                        <div
                            style="display: flex; justify-content: space-between; width: 100%; align-items: center;"
                        >
                            <span
                                >Best: <strong>{puzzle.bestMoveSan}</strong
                                ></span
                            >
                            <span class="eval-tag eval-good"
                                >{formatAbsEval(puzzle.evalBefore)}</span
                            >
                        </div>
                        {#if otherGoodMoves.length > 0}
                            <div
                                class="alt-moves"
                                style="width: 100%; display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(139, 92, 246, 0.2);"
                            >
                                <div
                                    style="font-size: 0.75rem; text-transform: uppercase; opacity: 0.8; margin-bottom: 0.2rem;"
                                >
                                    Alternatives
                                </div>
                                {#each otherGoodMoves as alt}
                                    <div
                                        style="display: flex; justify-content: space-between; width: 100%; align-items: center;"
                                    >
                                        <span><strong>{alt.san}</strong></span>
                                        <span
                                            class="eval-tag eval-good"
                                            style="margin-left: 0;"
                                            >{formatAbsEval(
                                                alt.evalScore,
                                            )}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>

            <div class="puzzle-actions">
                {#if feedback === "incorrect" || showingAnswer}
                    <button
                        class="action-btn"
                        onclick={() => goTo(currentIndex)}
                        ><RotateCcw size={16} /> Retry</button
                    >
                {/if}
                {#if !showingAnswer && feedback !== "correct" && feedback !== "best"}
                    <button class="action-btn action-show" onclick={showAnswer}
                        >Show answer</button
                    >
                {/if}
                {#if feedback === "best" || feedback === "correct" || showingAnswer}
                    {#if currentIndex < mistakes.length - 1}
                        <button
                            class="action-btn action-next"
                            onclick={() => goTo(currentIndex + 1)}
                            >Next <ChevronRight size={16} /></button
                        >
                    {:else}
                        <div
                            class="feedback feedback-best"
                            style="flex: 1; justify-content: center; margin: 0; padding: 0.6rem;"
                        >
                            All puzzles complete!
                        </div>
                    {/if}
                {/if}
            </div>
        </aside>
    </div>

    <nav class="puzzle-bar card">
        <button
            class="nav-btn"
            onclick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}><ChevronLeft size={18} /></button
        >
        <div class="puzzle-dots">
            {#each mistakes as _, i}
                <button
                    class="puzzle-dot"
                    class:active={i === currentIndex}
                    class:solved={solved[i]}
                    onclick={() => goTo(i)}>{i + 1}</button
                >
            {/each}
        </div>
        <button
            class="nav-btn"
            onclick={() => goTo(currentIndex + 1)}
            disabled={currentIndex >= mistakes.length - 1}
            ><ChevronRight size={18} /></button
        >
        <div class="bar-stats">
            <span class="solved-count">{solvedCount}/{mistakes.length}</span>
        </div>
    </nav>
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
    }

    .board-and-eval {
        display: flex;
        gap: 0.5rem;
        width: 100%;
        height: 100%;
        align-items: stretch;
        justify-content: center;
    }

    .board-wrapper {
        flex: 1;
        max-width: 100%;
        aspect-ratio: 1; /* Keep the board square */
    }

    @media (max-width: 768px) {
        .puzzle-main {
            grid-template-columns: 1fr;
        }

        .board-and-eval {
            /* Even on mobile, keep eval bar to the left and board taking up the rest */
            max-width: 100%;
        }
    }

    .puzzle-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: rgba(30, 30, 40, 0.6);
        min-height: 400px;
        padding: 1.25rem;
    }
    .puzzle-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    .puzzle-label {
        font-weight: 700;
        color: var(--color-text-main);
    }
    .move-badge {
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        color: var(--color-text-muted);
    }

    .bad-move {
        color: #f87171;
        font-weight: 700;
        font-family: monospace;
    }
    .eval-drop-tag {
        color: #f87171;
        font-weight: 600;
        font-size: 0.85rem;
    }
    .prompt-text {
        font-weight: 600;
        margin-top: 0.5rem;
    }

    .notation-panel h4 {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: var(--color-text-muted);
        margin-bottom: 0.5rem;
    }
    .notation-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
    }
    .notation-move {
        font-family: monospace;
        font-size: 0.9rem;
        padding: 0.1rem 0.3rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
    }
    .move-num {
        color: var(--color-text-muted);
        margin-right: 2px;
    }

    .feedback-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .feedback {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.75rem;
        border-radius: 8px;
        font-size: 0.9rem;
        border: 1px solid transparent;
    }
    .feedback-evaluating {
        background: rgba(139, 92, 246, 0.05);
        color: var(--color-text-muted);
    }
    .feedback-best {
        background: rgba(74, 222, 128, 0.1);
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.2);
    }
    .feedback-good {
        background: rgba(251, 191, 36, 0.1);
        color: #fbbf24;
        border-color: rgba(251, 191, 36, 0.2);
    }
    .feedback-wrong {
        background: rgba(248, 113, 113, 0.1);
        color: #f87171;
        border-color: rgba(248, 113, 113, 0.2);
    }
    .feedback-answer {
        background: rgba(139, 92, 246, 0.1);
        color: #a78bfa;
    }
    .alt-moves {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-top: 0.2rem;
    }

    .eval-tag {
        font-family: monospace;
        font-size: 0.75rem;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        margin-left: auto;
    }
    .eval-good {
        background: #065f46;
        color: #6ee7b7;
    }
    .eval-bad {
        background: #7f1d1d;
        color: #fca5a5;
    }

    .puzzle-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: auto;
    }
    .action-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.6rem;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: white;
        cursor: pointer;
        font-size: 0.85rem;
    }
    .action-next {
        background: #6366f1;
        border-color: #6366f1;
    }

    .puzzle-bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background: rgba(30, 30, 40, 0.6);
    }
    .nav-btn {
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
        border-radius: 6px;
        cursor: pointer;
        padding: 0.4rem;
    }
    .nav-btn:disabled {
        opacity: 0.3;
    }
    .puzzle-dots {
        display: flex;
        gap: 0.4rem;
        flex: 1;
        justify-content: center;
        flex-wrap: wrap;
    }
    .puzzle-dot {
        width: 30px;
        height: 30px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: var(--color-text-muted);
        cursor: pointer;
        font-size: 0.75rem;
    }
    .puzzle-dot.active {
        background: #6366f1;
        border-color: #6366f1;
        color: white;
    }
    .puzzle-dot.solved {
        border-color: #4ade80;
        color: #4ade80;
    }
    .bar-stats {
        font-size: 0.8rem;
        color: var(--color-text-muted);
    }
</style>
