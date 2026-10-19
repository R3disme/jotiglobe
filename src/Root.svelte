<script lang="ts">
	import App from './App.svelte';
	import Stats from './Stats.svelte';
	import GroupPage from './GroupPage.svelte';
	import { route } from './lib/router.svelte';
	import { groupIdFromPath } from './lib/data';

	const page = $derived(route.path.replace(/\/+$/, '') === '/stats' ? 'stats' : route.path.startsWith('/groups/') ? 'group' : 'globe');

	// keep the canonical URL in step with the page (index.html ships the one for /)
	$effect(() => {
		const link = document.querySelector<HTMLLinkElement>('link[rel=canonical]');
		if (link) link.href = new URL(page === 'globe' ? '/' : route.path, location.origin).href;
	});
</script>

{#if page === 'stats'}
	<Stats />
{:else if page === 'group'}
	{#key route.path}<GroupPage id={groupIdFromPath(route.path)} />{/key}
{:else}
	<App />
{/if}
