import { browser } from '$app/env';

const KEY = 'jotiglobe:stats';
let optedIn = false;
if (browser)
	try {
		optedIn = localStorage.getItem(KEY) === '1';
	} catch {}

export const privacy = $state({ open: false, stats: optedIn });

export function setStats(on: boolean) {
	privacy.stats = on;
	try {
		if (on) {
			localStorage.setItem(KEY, '1');
			// this visit was already counted before switching on
			localStorage.setItem('jotiglobe:counted', new Date().toISOString().slice(0, 10));
		}
		else {
			localStorage.removeItem(KEY);
			localStorage.removeItem('jotiglobe:counted');
		}
	} catch {}
}

/** how hard the globe worked on this device, reported once per visit without anything that identifies it */
export const globePerf = { frames: 0, cost: 0, fps: 0, quality: 0 };
