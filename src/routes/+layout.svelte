<script lang="ts">
	import "../app.css";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
	<link rel="apple-touch-icon" href="/favicon-180.png" />
</svelte:head>

{@render children()}
