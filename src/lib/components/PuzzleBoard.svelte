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
        onUserMove: (from: string, to: string, san: string) => void;
        interactive: boolean;
        pendingMove?: { from: string; to: string; promotion?: string } | null;
        onMoveApplied?: (san: string) => void;
    }

    let {
        fen,
        orientation,
        onUserMove,
        interactive,
        pendingMove = null,
        onMoveApplied,
    }: Props = $props();

    let boardEl: HTMLElement;
    let ground: Api | null = null;
    let chess = $state(new Chess(fen));

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

    function syncBoard() {
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
                syncBoard();
                onUserMove(orig, dest, result.san);
            }
        } catch {
            syncBoard();
        }
    }

    onMount(() => {
        if (!boardEl) return;

        ground = Chessground(boardEl, {
            fen: chess.fen(),
            orientation: orientation,
            turnColor: turnColor(),
            animation: { enabled: true, duration: 200 },
            movable: {
                free: false,
                color: interactive ? orientation : undefined,
                dests: interactive ? toDests() : new Map(),
                events: {
                    after: handleMove,
                },
            },
            draggable: { enabled: true },
            premovable: { enabled: false },
            check: chess.isCheck(),
        });

        return () => {
            ground?.destroy();
        };
    });

    // React to fen changes (puzzle navigation)
    $effect(() => {
        if (ground && fen) {
            chess = new Chess(fen);
            syncBoard();
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
                    syncBoard();
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
