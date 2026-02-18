<script lang="ts">
    import { onMount } from "svelte";
    import { Chessground } from "chessground";
    import { type Api } from "chessground/api";
    import type { Key } from "chessground/types";
    import { Chess } from "chess.js";
    import "chessground/assets/chessground.base.css";
    import "chessground/assets/chessground.brown.css";
    import "chessground/assets/chessground.cburnett.css";

    interface Props {
        fen: string;
        orientation: "white" | "black";
        onUserMove: (
            from: string,
            to: string,
            san: string,
            promotion?: string,
        ) => void;
        interactive: boolean;
        pendingMove?: { from: string; to: string; promotion?: string } | null;
        onMoveApplied?: (san: string) => void;
        introMove?: { preMoveFen: string; from: string; to: string } | null;
        lastMoveSquares?: [string, string] | null;
    }

    let {
        fen,
        orientation,
        onUserMove,
        interactive,
        pendingMove = null,
        onMoveApplied,
        introMove = null,
        lastMoveSquares = null,
    }: Props = $props();

    let boardEl: HTMLElement;
    let ground: Api | null = null;
    // Intentional: component is re-mounted via {#key} when puzzle changes,
    // so capturing the initial fen is correct.
    // eslint-disable-next-line
    let chess = new Chess(fen);
    let introPlayed = false;

    function toDests(): Map<Key, Key[]> {
        const dests = new Map<Key, Key[]>();
        for (const m of chess.moves({ verbose: true })) {
            const from = m.from as Key;
            if (!dests.has(from)) dests.set(from, []);
            dests.get(from)!.push(m.to as Key);
        }
        return dests;
    }

    function turnColor(): "white" | "black" {
        return chess.turn() === "w" ? "white" : "black";
    }

    function syncPosition() {
        if (!ground) return;
        ground.set({
            fen: chess.fen(),
            orientation: orientation,
            turnColor: turnColor(),
            lastMove: lastMoveSquares
                ? [lastMoveSquares[0] as Key, lastMoveSquares[1] as Key]
                : undefined,
            movable: {
                free: false,
                color: interactive ? orientation : undefined,
                dests: interactive ? toDests() : new Map(),
            },
            check: chess.isCheck(),
        });
    }

    function lockBoard() {
        if (!ground) return;
        ground.set({
            turnColor: turnColor(),
            movable: { free: false, color: undefined, dests: new Map() },
            check: chess.isCheck(),
        });
    }

    function handleMove(orig: Key, dest: Key) {
        const piece = chess.get(orig as any);
        let promotion: string | undefined;
        if (piece?.type === "p") {
            const rank = dest[1];
            if (
                (piece.color === "w" && rank === "8") ||
                (piece.color === "b" && rank === "1")
            ) {
                promotion = "q";
            }
        }

        try {
            const result = chess.move({
                from: orig,
                to: dest,
                promotion: promotion as any,
            });
            if (result) {
                // Do NOT call syncPosition() here — chessground already
                // shows the piece in its new square from the drag.
                // Just lock the board so no further moves are allowed
                // while the engine evaluates.
                lockBoard();
                onUserMove(orig, dest, result.san, promotion);
            }
        } catch {
            // Invalid move — reset board to current chess position
            syncPosition();
        }
    }

    onMount(() => {
        if (!boardEl) return;

        // If we have an intro move, start from the pre-move position
        const shouldPlayIntro =
            introMove && introMove.preMoveFen && introMove.from && introMove.to;
        const initialFen = shouldPlayIntro
            ? introMove!.preMoveFen
            : chess.fen();
        const initialChess = shouldPlayIntro
            ? new Chess(introMove!.preMoveFen)
            : chess;

        ground = Chessground(boardEl, {
            fen: initialFen,
            orientation: orientation,
            turnColor: initialChess.turn() === "w" ? "white" : "black",
            animation: { enabled: true, duration: 300 },
            movable: {
                free: false,
                color: undefined, // locked initially during intro
                dests: new Map(),
                events: {
                    after: handleMove,
                },
            },
            draggable: { enabled: true },
            premovable: { enabled: false },
            check: initialChess.isCheck(),
        });

        // Play intro animation after a short delay
        if (shouldPlayIntro && !introPlayed) {
            introPlayed = true;
            setTimeout(() => {
                if (!ground) return;
                // Set the post-move position — chessground will animate the difference
                const from = introMove!.from as Key;
                const to = introMove!.to as Key;
                ground.set({
                    fen: chess.fen(), // puzzle position (after opponent's move)
                    turnColor: turnColor(),
                    lastMove: [from, to],
                    check: chess.isCheck(),
                });
                // After animation finishes, enable interaction
                setTimeout(() => {
                    if (!ground) return;
                    ground.set({
                        movable: {
                            free: false,
                            color: interactive ? orientation : undefined,
                            dests: interactive ? toDests() : new Map(),
                        },
                    });
                }, 350);
            }, 400);
        } else {
            // No intro — set up normally
            syncPosition();
        }

        return () => {
            ground?.destroy();
        };
    });

    // React to fen changes (puzzle navigation via {#key})
    $effect(() => {
        if (ground && fen) {
            chess = new Chess(fen);
            syncPosition();
        }
    });

    // React to interactive prop changes
    $effect(() => {
        if (ground) {
            ground.set({
                movable: {
                    free: false,
                    color: interactive ? orientation : undefined,
                    dests: interactive ? toDests() : new Map(),
                },
            });
        }
    });

    // React to pendingMove (for "show answer" functionality)
    $effect(() => {
        if (pendingMove && ground) {
            try {
                const result = chess.move({
                    from: pendingMove.from,
                    to: pendingMove.to,
                    promotion: pendingMove.promotion as any,
                });
                if (result) {
                    syncPosition();
                    onMoveApplied?.(result.san);
                }
            } catch {
                /* Invalid move */
            }
        }
    });
</script>

<div class="puzzle-board-container">
    <div bind:this={boardEl} class="cg-board-wrap"></div>
</div>

<style>
    .puzzle-board-container {
        width: 100%;
        aspect-ratio: 1;
        position: relative;
    }

    .cg-board-wrap {
        width: 100%;
        height: 100%;
    }
</style>
