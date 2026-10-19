<script lang="ts" module>
	export const ACK_KEY = 'jotiglobe:privacy-notice-v3';
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { privacy, setStats } from './privacy.svelte.ts';

	let { open = $bindable(false) }: { open?: boolean } = $props();
	let dialog: HTMLDialogElement;

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
			<li>Your browser saves a small note that you've read this{__USAGE_STATS__ ? ' and what you chose below' : ''}, so it won't show up again.</li>
			<li>
				If you press “Find groups near me”, your browser will ask for your location. It's only used on your own screen to sort the list.
				It isn't sent to me and it isn't saved.
			</li>
			{#if __USAGE_STATS__}<li>
				The site counts visits anonymously: only that someone visited and how smoothly the globe ran (its frame time), so I can keep it
				fast on old computers. Not which pages you open, not your IP address and nothing else that could tell who you are. It stays
				on my own server and is deleted after 30 days.
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
		{#if __USAGE_STATS__}
			<button
				type="button"
				role="switch"
				aria-checked={privacy.stats}
				onclick={() => setStats(!privacy.stats)}
				class="border-forest-950/15 mt-5 flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-black/5"
			>
				<span class={['relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors', privacy.stats ? 'bg-forest-700' : 'bg-forest-950/25']}>
					<span class={['absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform', privacy.stats && 'translate-x-4']}></span>
				</span>
				<span class="text-[14px] leading-snug">
					<span class="block font-semibold">Also share which pages I open</span>
					<span class="text-forest-950/70">
						Helps me see which parts are used most. Your browser then keeps a note with today's date, so a second visit the same day isn't
						counted twice. The note never leaves your browser. You can change this any time under “Privacy”.
					</span>
				</span>
			</button>
		{/if}
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
