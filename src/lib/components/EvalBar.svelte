<script lang="ts">
    interface Props {
        evalScore: number; // Positive means white advantage, negative means black
        orientation?: "white" | "black"; // Which side is at the bottom
    }

    let { evalScore = 0, orientation = "white" }: Props = $props();

    // Use a sigmoid function to map eval to percentage smoothly.
    // Lichess uses a similar non-linear scaling.
    const whitePercentage = $derived(() => {
        // Mate is represented by very large eval (e.g. 100 or -100).
        // 50 + 50 * (2/pi) * atan(eval / 4) maps eval to 0-100% nicely.
        const pct = 50 + 50 * (2 / Math.PI) * Math.atan(evalScore / 4);
        return Math.max(0, Math.min(100, pct));
    });

    const isWhiteAdvantage = $derived(evalScore >= 0);
    const absScore = $derived(Math.abs(evalScore));

    const displayScore = $derived(() => {
        if (absScore > 90) return "M"; // Simplistic mate indicator
        return absScore.toFixed(1);
    });
</script>

<div class="eval-bar-container" class:flipped={orientation === "black"}>
    <div
        class="eval-fill black-fill"
        style="height: {100 - whitePercentage()}%"
    ></div>
    <div
        class="eval-fill white-fill"
        style="height: {whitePercentage()}%"
    ></div>

    <div class="eval-text {isWhiteAdvantage ? 'white-text' : 'black-text'}">
        {displayScore()}
    </div>
</div>

<style>
    .eval-bar-container {
        width: 24px;
        height: 100%;
        background-color: #333;
        display: flex;
        flex-direction: column;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    }

    /* Black fill first, white fill second. Default: white on bottom. */
    .eval-bar-container:not(.flipped) {
        flex-direction: column;
    }

    /* Flipped: white on top, black on bottom. */
    .eval-bar-container.flipped {
        flex-direction: column-reverse;
    }

    .eval-fill {
        width: 100%;
        transition: height 0.4s ease-out; /* animate eval changes */
    }

    .white-fill {
        background-color: #fff;
    }

    .black-fill {
        background-color: #333;
    }

    .eval-text {
        position: absolute;
        width: 100%;
        text-align: center;
        font-family: monospace;
        font-size: 0.75rem;
        font-weight: bold;
        padding: 4px 0;
        z-index: 2;
    }

    /* Text flows to the dominant side's starting edge.
       If white is winning, text goes to the bottom edge for white, top edge for black. 
    */
    .eval-bar-container:not(.flipped) .white-text {
        bottom: 0;
        color: #333;
    }
    .eval-bar-container:not(.flipped) .black-text {
        top: 0;
        color: #fff;
    }

    .eval-bar-container.flipped .white-text {
        top: 0;
        color: #333;
    }
    .eval-bar-container.flipped .black-text {
        bottom: 0;
        color: #fff;
    }
</style>
