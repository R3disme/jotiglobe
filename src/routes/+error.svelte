<script lang="ts">
	import { page } from '$app/state';
	import { ISSUES, errors, scene } from '#lib/error-pages.js';

	const code = $derived(page.status);
	const info = $derived((errors as unknown as Record<number, [string, string]>)[code] ?? [code >= 500 ? 'Something went wrong' : 'Lost in the woods', page.error?.message ?? '']);
</script>

<svelte:head>
	<title>{code} {info[0]} – JotiGlobe</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="grid min-h-dvh place-items-center px-5 py-10 text-center">
	<div class="max-w-md">
		<div class="scene mx-auto w-full max-w-[300px]">{@html scene(code)}</div>
		<p class="font-heading text-moss mt-2 text-7xl leading-none font-bold">{code}</p>
		<h1 class="mt-1 text-2xl font-semibold">{info[0]}</h1>
		<p class="text-sand/75 mt-3">{info[1]}</p>
		<a href="/" class="bg-moss text-forest-950 mt-6 inline-block rounded-md px-4 py-2.5 text-sm font-semibold">Back to the globe</a>
		<p class="text-sand/50 mt-6 text-sm">
			If you believe this is an error, <a href="{ISSUES}?title={encodeURIComponent(`${code} on JotiGlobe`)}" rel="noopener noreferrer" class="underline">open an issue on GitHub</a>.
		</p>
	</div>
</main>

<style>
	.scene :global(svg) {
		width: 100%;
		height: auto;
	}
	@media (prefers-reduced-motion: no-preference) {
		.scene :global(.st) {
			animation: st 3s ease-in-out infinite alternate;
		}
	}
	@keyframes st {
		to {
			transform: translateY(-4px);
			opacity: 0.3;
		}
	}
</style>
