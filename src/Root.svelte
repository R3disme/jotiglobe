<script lang="ts">
	import App from './App.svelte';
	import Stats from './Stats.svelte';
	import GroupPage from './GroupPage.svelte';
	import { route } from './lib/router.svelte';
	
	const page = $derived(route.path.replace(/\/+$/, '') === '/stats' ? 'stats' : /^\/(groups|countries)\//.test(route.path) ? 'explore' : 'globe');

	$effect(() => {
		const link = document.querySelector<HTMLLinkElement>('link[rel=canonical]');
		if (link) link.href = new URL(page === 'globe' ? '/' : route.path, location.origin).href;
	});
</script>

{#if page === 'stats'}
	<Stats />
{:else if page === 'explore'}
	<GroupPage />
{:else}
	<App />
{/if}
