<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Chessground } from "chessground";
    import { type Api } from "chessground/api";
    import { type Config } from "chessground/config";
    import "chessground/assets/chessground.base.css";
    import "chessground/assets/chessground.brown.css";
    import "chessground/assets/chessground.cburnett.css";

    interface Props {
        fen?: string;
        orientation?: "white" | "black";
        config?: Config;
    }

    // Type annotation for Svelte 5 props
    let { fen = "start", orientation = "white", config = {} }: Props = $props();

    let el: HTMLElement;
    let ground: Api | null = null;

    $effect(() => {
        if (ground) {
            ground.set({
                fen: fen,
                orientation: orientation,
                ...config,
            });
        }
    });

    onMount(() => {
        if (el) {
            ground = Chessground(el, {
                fen: fen,
                orientation: orientation,
                viewOnly: true,
                animation: {
                    enabled: true,
                    duration: 200,
                },
                ...config,
            });
        }

        return () => {
            // Cleanup handled by Chessground usually
        };
    });
</script>

<div class="board-container">
    <div bind:this={el} class="cg-board-wrap"></div>
</div>

<style>
    .board-container {
        width: 100%;
        aspect-ratio: 1;
        position: relative;
        max-width: 400px;
    }

    .cg-board-wrap {
        width: 100%;
        height: 100%;
    }
</style>
