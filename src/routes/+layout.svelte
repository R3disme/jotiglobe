<script lang="ts">
	import '../app.css';
	import '../flags.css';
	import { afterNavigate } from '$app/navigation';
	import PrivacyNotice from '#lib/PrivacyNotice.svelte';
	import { privacy } from '#lib/privacy.svelte.ts';
	import { countView } from '#lib/router.svelte.ts';

	let { children } = $props();

	afterNavigate(({ from, to, type }) => {
		if (!to) return;
		if (type === 'enter') countView(to.url.pathname, true);
		else if (from?.url.pathname !== to.url.pathname) countView(to.url.pathname);
	});
</script>

{@render children()}

<PrivacyNotice bind:open={privacy.open} />
