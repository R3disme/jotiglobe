<script lang="ts" module>
	export const ACK_KEY = 'jotiglobe:privacy-notice-v2';
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();
	let dialog: HTMLDialogElement;

	// Shown on the first visit. Remembering that you've read it is the only thing this site stores.
	onMount(() => {
		let seen = false;
		try {
			seen = localStorage.getItem(ACK_KEY) === '1';
		} catch {}
		if (!seen) open = true;
	});

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	function ok() {
		try {
			localStorage.setItem(ACK_KEY, '1');
		} catch {}
		open = false;
	}
</script>

<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	class="bg-sand text-forest-950 m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg p-0 shadow-xl"
	aria-labelledby="privacy-title"
>
	<div class="max-h-[85dvh] overflow-y-auto px-6 py-6 sm:px-8">
		<h2 id="privacy-title" class="text-xl font-semibold">Before you look around</h2>
		<p class="mt-3 text-[15px] leading-relaxed">
			This map shows the scout groups signed up for JOTA-JOTI, taken from the public group directory on jotajoti.info.
			A few things about privacy:
		</p>
		<ul class="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
			<li>No cookies, no tracking, and nothing is loaded from other websites.</li>
			<li>Your browser saves one small note that you've read this, so it won't show up again.</li>
			<li>
				If you press “Find groups near me”, your browser will ask for your location. It's only used on your own screen to sort the list.
				It isn't sent to me and it isn't saved.
			</li>
			{#if __USAGE_STATS__}<li>
				The site collects anonymous usage statistics: which pages are opened, how many, and how fast they load. I use them to make
				the site faster and to see which parts people use the most. They don't include your IP address, your browser or anything else
				that could tell who you are, they stay on my own server, and they're deleted after 30 days.
			</li>{/if}
			<li>
				The site is reached through Tailscale Funnel. Tailscale passes the encrypted connection on, so they see your IP address but not
				the pages.
			</li>
			<li>
				JotiGlobe is open source, so you can check all of this yourself. The code is on GitHub:
				<a href="https://github.com/R3disme/jotiglobe" target="_blank" rel="noopener noreferrer" class="font-medium underline underline-offset-2">github.com/R3disme/jotiglobe</a>.
			</li>
		</ul>
		<div class="mt-6 flex items-center justify-between gap-4">
			<p class="text-forest-950/60 text-sm">– 1st Sandnes Scout Group, Norway</p>
			<button
				type="button"
				onclick={ok}
				class="bg-forest-800 text-sand rounded-md px-5 py-2 text-sm font-medium hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
			>
				OK
			</button>
		</div>
	</div>
</dialog>
