<script lang="ts">
	import { SITE } from './data.ts';

	let { title, description, path, jsonld = null }: { title: string; description: string; path: string; jsonld?: object | null } = $props();
	const url = $derived(SITE + path);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if jsonld}
		{@html `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>`}
	{/if}
</svelte:head>
