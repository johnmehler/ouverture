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
    }

    let {
        fen,
        orientation,
        onUserMove,
        interactive,
        pendingMove = null,
        onMoveApplied,
        introMove = null,
    }: Props = $props();

    let boardEl: HTMLElement;
    let ground: Api | null = null;
    // Intentional: component is re-mounted via {#key} when puzzle changes,
    // so capturing the initial fen is correct.
    // eslint-disable-next-line
    let chess = new Chess(fen);
    let introPlayed = false;
    // Guard to prevent effects from touching the board while a user move is settling
    let moveLocked = false;

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
            movable: {
                free: false,
                color: interactive ? orientation : undefined,
                dests: interactive ? toDests() : new Map(),
            },
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
                moveLocked = true;

                // Update chessground's internal state to the NEW position
                // with animation DISABLED so there's no visual snap.
                // Chessground already shows the piece at its destination from
                // the drag — this just syncs its internal FEN to match.
                ground!.set({
                    animation: { enabled: false },
                });
                ground!.set({
                    fen: chess.fen(),
                    turnColor: turnColor(),
                    lastMove: [orig, dest],
                    movable: {
                        free: false,
                        color: undefined,
                        dests: new Map(),
                    },
                    check: chess.isCheck(),
                });
                // Re-enable animation for future moves
                ground!.set({
                    animation: { enabled: true, duration: 300 },
                });

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
                const from = introMove!.from as Key;
                const to = introMove!.to as Key;
                ground.set({
                    fen: chess.fen(),
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
            moveLocked = false;
            syncPosition();
        }
    });

    // React to interactive prop changes — but NOT during a locked move
    $effect(() => {
        // Read interactive to track it as a dependency
        const isInteractive = interactive;
        if (ground && !moveLocked) {
            ground.set({
                movable: {
                    free: false,
                    color: isInteractive ? orientation : undefined,
                    dests: isInteractive ? toDests() : new Map(),
                },
            });
        }
    });

    // React to pendingMove (for "show answer" functionality)
    $effect(() => {
        if (pendingMove && ground) {
            moveLocked = false;
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
