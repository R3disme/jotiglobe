// Static error pages (no JavaScript), served by nginx as /_errors/<code>.html and by Vite in dev/preview.
export const ISSUES = 'https://github.com/R3disme/jotiglobe/issues/new';

export const errors = {
	400: ['Bad request', 'That request got its knots in a tangle.'],
	401: ['Login needed', 'This part of camp is for leaders only.'],
	403: ['Off limits', "This tent is off limits, even with a good reason."],
	404: ['Lost in the woods', 'Hm, it seems you forgot to use your compass and got lost. This page doesn’t exist.'],
	405: ['Not allowed', "That's not how we do things at this camp."],
	408: ['Timed out', 'We waited at the meeting point, but you never showed up.'],
	410: ['Packed up', 'This campsite has been packed up and is gone for good.'],
	418: ['I’m a teapot', 'I’m a little teapot, short and stout. I can’t brew coffee here, but tea is always on at camp.'],
	429: ['Too many requests', 'Slow down, scout! Take a breather and try again in a moment.'],
	500: ['Server error', 'Something went wrong in the camp kitchen.'],
	502: ['Bad gateway', 'The message got lost between the radio stations.'],
	503: ['Unavailable', 'The campfire is out for a moment. Try again shortly.'],
	504: ['Gateway timeout', 'The radio relay took too long to answer.']
};

const MOSS = '#7fb48d';
const OCHRE = '#ecc15a';
const SAND = '#f5f1e8';
const SKY = '#5e9bc4';
const RED = '#e5533d';
const INK = '#0e1b14';
const WOOD = '#5c4a2e';
const STONE = '#9aa89f';

const faces = {
	happy: `<path d="M-5 -83h.1M5 -83h.1" stroke-width="3.4"/><path d="M-4.5 -78Q0 -74 4.5 -78"/>`,
	worried: `<path d="M-5 -83h.1M5 -83h.1" stroke-width="3.4"/><path d="M-8 -87l5 -1.5M8 -87l-5 -1.5M-4 -75Q0 -79 4 -75"/>`,
	alarm: `<circle cx="-5" cy="-83" r="3.6" fill="${SAND}" stroke-width="1"/><circle cx="5" cy="-83" r="3.6" fill="${SAND}" stroke-width="1"/><path d="M-5 -83h.1M5 -83h.1" stroke-width="3"/><path d="M-9 -89l6 -2M9 -89l-6 -2"/><ellipse cx="0" cy="-75" rx="2.8" ry="3.4" fill="${INK}"/>`,
	sleep: `<path d="M-8 -83q3 3 6 0M2 -83q3 3 6 0M-2 -76q2 2 4 0"/>`,
	tired: `<path d="M-8 -84l5 2M8 -84l-5 2"/><ellipse cx="0" cy="-76" rx="3.4" ry="2.8" fill="${INK}"/>`,
	flat: `<path d="M-5 -83h.1M5 -83h.1" stroke-width="3.4"/><path d="M-3.5 -76h7"/>`
};

const scout = ({ x = 120, y = 168, s = 0.85, f = 1, a = [-17, -44], b = [17, -44], face = 'happy', look = 0, sit, tilt = 0, back = '', hold = '' } = {}) => {
	const h = sit ?? 0;
	const d = sit === undefined ? 0 : 30 - h;
	const arm = (sx, [hx, hy]) =>
		`<path d="M${sx} -66L${hx} ${hy}" stroke="${MOSS}" stroke-width="8" stroke-linecap="round"/><circle cx="${hx}" cy="${hy}" r="4" fill="#e8c4a0"/>`;
	const legs =
		sit === undefined
			? `<path d="M-6 -26V-8M6 -26V-8" stroke="#e8c4a0" stroke-width="7"/><path d="M-6 -16V-8M6 -16V-8" stroke="${SAND}" stroke-width="7"/><rect x="-12" y="-8" width="13" height="8" rx="3" fill="#3b2a1a"/><rect x="-1" y="-8" width="13" height="8" rx="3" fill="#3b2a1a"/><rect x="-13" y="-42" width="26" height="17" rx="2" fill="#46607a"/>`
			: `<rect x="6" y="${-h - 11}" width="16" height="7" rx="3" fill="#e8c4a0"/>${h > 8 ? `<rect x="17" y="${-h - 6}" width="7" height="${h - 2}" fill="#e8c4a0"/>` : ''}<rect x="16" y="-8" width="15" height="8" rx="3" fill="#3b2a1a"/><rect x="-13" y="${-h - 13}" width="25" height="13" rx="3" fill="#46607a"/>`;
	return `<g transform="translate(${x} ${y}) scale(${f * s} ${s})">${legs}<g transform="translate(0 ${d})">${back}${arm(-12, a)}<path d="M-13 -42L-12 -69Q0 -75 12 -69L13 -42Z" fill="${MOSS}"/><path d="M-8 -70L0 -52 8 -70Z" fill="${OCHRE}"/><circle cx="0" cy="-60" r="2.2" fill="${RED}"/><g transform="rotate(${tilt} 0 -72)"><ellipse cx="-12" cy="-85" rx="2.5" ry="6" fill="#6b4a2a"/><ellipse cx="12" cy="-85" rx="2.5" ry="6" fill="#6b4a2a"/><circle cy="-84" r="13" fill="#e8c4a0"/><circle cx="-8" cy="-78" r="2.6" fill="${RED}" opacity=".25"/><circle cx="8" cy="-78" r="2.6" fill="${RED}" opacity=".25"/><g transform="translate(${look} 0)" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round">${faces[face]}</g><ellipse cx="0" cy="-94" rx="21" ry="4" fill="${WOOD}"/><path d="M-11 -95Q-11 -111 0 -111Q11 -111 11 -95Z" fill="#6e5836"/><path d="M-11 -98h22v3.5h-22Z" fill="${RED}"/></g>${arm(12, b)}${hold}</g></g>`;
};

const svg = (inner) =>
	`<svg viewBox="0 0 240 200" width="300" height="250" font-family="Georgia,serif" font-weight="700" aria-hidden="true">${inner}</svg>`;

const ground = `<path d="M0 168Q60 156 120 164T240 160V200H0Z" fill="#1b3123"/><path d="M0 184Q80 174 150 182T240 178V200H0Z" fill="#22402d"/>`;
const stars = (pts = [[30, 30], [72, 16], [112, 40], [150, 20], [214, 66], [20, 78]]) =>
	pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${SAND}" opacity=".7"/>`).join('');
const moon = (x = 200, y = 34) => `<circle cx="${x}" cy="${y}" r="13" fill="${SAND}"/><circle cx="${x + 7}" cy="${y - 4}" r="11" fill="#0a140e"/>`;
const sky = (pts) => moon() + stars(pts);
const text = (x, y, size, str, fill = OCHRE, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${str}</text>`;

const pine = (x, y, s = 1) =>
	`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2.5" y="-9" width="5" height="9" fill="#3b2a1a"/><path d="M-16 -8L0 -36 16 -8Z" fill="#22402d"/><path d="M-12 -26L0 -54 12 -26Z" fill="#2a5238"/></g>`;

const tent = (x, y, s = 1, light = '#0e1b14', sy = 1) =>
	`<g transform="translate(${x} ${y}) scale(${s} ${s * sy})"><path d="M-34 0L0 -44 34 0Z" fill="${OCHRE}"/><path d="M0 -44L34 0H10L0 -26Z" fill="#000" opacity=".12"/><path d="M-10 0L0 -26 10 0Z" fill="${light}"/><path d="M0 -44V-48" stroke="${WOOD}" stroke-width="2"/></g>`;

const fire = (x, y, s = 1, lit = true) =>
	`<g transform="translate(${x} ${y}) scale(${s})">${
		lit
			? `<circle cy="-14" r="22" fill="${OCHRE}" opacity=".12"/>`
			: ''
	}<ellipse cy="-1" rx="22" ry="5" fill="#13241a"/><path d="M-16 -2L14 -9M16 -2L-14 -9" stroke="${lit ? WOOD : '#2b2118'}" stroke-width="5" stroke-linecap="round"/>${
		lit
			? `<path d="M0 -9Q-13 -14 -7 -28Q-4 -23 -1 -32Q11 -21 9 -12Q5 -7 0 -9Z" fill="${RED}"/><path d="M0 -9Q-6 -12 -3 -19Q3 -16 5 -12Q3 -8 0 -9Z" fill="${OCHRE}"/>`
			: `<circle cx="-4" cy="-5" r="1.2" fill="${RED}" opacity=".5"/><circle cx="6" cy="-6" r="1" fill="${RED}" opacity=".4"/>`
	}${[-22, -15, -7, 7, 15, 22].map((a) => `<circle cx="${a}" cy="${a % 2 ? 2 : 3}" r="3.6" fill="#5a6b60"/>`).join('')}</g>`;

const mast = (x, y, h) =>
	`<g transform="translate(${x} ${y})"><path d="M-9 0L0 ${-h} 9 0ZM-6.5 ${-h * 0.3}H6.5M-4.5 ${-h * 0.6}H4.5" fill="none" stroke="${MOSS}" stroke-width="1.8"/><path d="M-6.5 ${-h * 0.3}L4.5 ${-h * 0.6}M6.5 ${-h * 0.3}L-4.5 ${-h * 0.6}" stroke="${MOSS}" stroke-width="1"/><circle cy="${-h - 3}" r="3.2" fill="${RED}"/></g>`;

const drop = (x, y) => `<path d="M${x} ${y - 5}Q${x + 4} ${y} ${x + 3} ${y + 3}A3 3 0 0 1 ${x - 3} ${y + 3}Q${x - 4} ${y} ${x} ${y - 5}Z" fill="${SKY}"/>`;
const wisp = (x, y, c = SAND, o = 0.5) => `<path class="st" d="M${x} ${y}q-6 -7 0 -13t0 -13t0 -12" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" opacity="${o}"/>`;
const log = (x, w, y = 154) => `<rect x="${x}" y="${y}" width="${w}" height="14" rx="7" fill="${WOOD}"/><ellipse cx="${x + w - 6}" cy="${y + 7}" rx="5" ry="7" fill="#7a5f38"/><ellipse cx="${x + w - 6}" cy="${y + 7}" rx="2" ry="3" fill="${WOOD}"/>`;

const scenes = {
	400: () => {
		const rope = `<path d="M-6 -50c-14 -8 -4 -22 10 -16s18 20 0 22 -20 -14 -4 -22 22 4 14 16" fill="none" stroke="${OCHRE}" stroke-width="3.2" stroke-linecap="round"/><path d="M-6 -50l-6 14M10 -28l10 10" stroke="${OCHRE}" stroke-width="3.2" stroke-linecap="round"/>`;
		return svg(
			sky() + ground + pine(24, 166, 1.2) + pine(212, 160, 1.3) +
			scout({ x: 112, face: 'worried', a: [-13, -50], b: [12, -50], hold: `<g transform="translate(0 -48) scale(1.7) translate(-4 48)">${rope}</g><circle cx="-13" cy="-50" r="4" fill="#e8c4a0"/><circle cx="12" cy="-50" r="4" fill="#e8c4a0"/>` }) +
			text(150, 80, 30, '?') + text(172, 58, 16, '?')
		);
	},
	401: () =>
		svg(
			sky() + ground + pine(18, 160, 1.1) + tent(172, 168, 1.5, OCHRE) +
			`<path d="M162 168l10 -40 10 40Z" fill="#0e1b14" opacity=".55"/><rect x="126" y="140" width="4" height="28" fill="${WOOD}"/><rect x="104" y="124" width="48" height="18" rx="2" fill="#6e5836" stroke="${WOOD}" stroke-width="2"/>` +
			text(128, 136.5, 8.5, 'LEADERS', SAND, 'text-anchor="middle"') +
			scout({ x: 62, face: 'worried', look: 2, b: [11, -70] })
		),
	403: () =>
		svg(
			sky() + ground + pine(222, 160, 1.1) + tent(176, 166, 1.4) +
			`<rect x="116" y="124" width="5" height="44" rx="2" fill="${WOOD}"/><circle cx="118.5" cy="123" r="4" fill="${OCHRE}"/><rect x="222" y="124" width="5" height="44" rx="2" fill="${WOOD}"/><circle cx="224.5" cy="123" r="4" fill="${OCHRE}"/>` +
			`<path d="M119 128Q172 156 224 128" fill="none" stroke="#d9c08a" stroke-width="3" stroke-linecap="round"/><path d="M171 142v4" stroke="#d9c08a" stroke-width="2"/><circle cx="171" cy="155" r="10" fill="${RED}"/><rect x="163" y="152.5" width="16" height="5" rx="1" fill="${SAND}"/>` +
			scout({ x: 62, face: 'worried', look: 1.5, b: [24, -76], hold: `<circle cx="24" cy="-78" r="6" fill="#e8c4a0"/>` })
		),
	404: () =>
		svg(
			sky() + ground + pine(24, 166, 1.25) + pine(208, 162, 1.35) + pine(56, 152, 0.8) + pine(182, 150, 0.8) +
			scout({
				x: 116, face: 'worried', tilt: -7, a: [-13, -52], b: [13, -52],
				hold: `<rect x="-19" y="-67" width="38" height="28" rx="2" fill="${SAND}" transform="rotate(4)"/><path d="M-12 -45l7 6 7 -9 7 7 7 -8" stroke="${SKY}" stroke-width="1.8" fill="none" transform="rotate(4)"/><path d="M-4 -62h8l-4 8Z" fill="#2a5238" transform="rotate(4)"/><path d="M-14 -58l4 4M-10 -58l-4 4" stroke="${RED}" stroke-width="1.6" transform="rotate(4)"/><circle cx="-18" cy="-52" r="4" fill="#e8c4a0"/><circle cx="18" cy="-52" r="4" fill="#e8c4a0"/>`
			}) +
			`<circle cx="178" cy="172" r="9" fill="${SAND}" stroke="${WOOD}" stroke-width="2.5"/><path d="M178 164l3 8h-6Z" fill="${RED}"/><path d="M178 180l3 -8h-6Z" fill="${SKY}"/>` +
			text(150, 80, 30, '?') + text(172, 56, 16, '?')
		),
	405: () => {
		const inv = tent(172, 116, 1.1, '#0e1b14', -1);
		const ropes = `<path d="M135 116L118 164M209 116L226 164" stroke="${SAND}" stroke-width="1.5" opacity=".7"/><path d="M114 168l4 -8 4 8ZM222 168l4 -8 4 8Z" fill="${RED}"/>`;
		return svg(
			sky() + ground + pine(22, 160, 1.1) + ropes + inv +
			scout({
				x: 66, face: 'worried', look: 1.5, b: [24, -52],
				hold: `<path d="M24 -52L34 -76" stroke="${WOOD}" stroke-width="3.2" stroke-linecap="round"/><rect x="26" y="-86" width="18" height="9" rx="2" fill="#7a5f38" transform="rotate(30 35 -80)"/>`
			}) + drop(96, 112) + text(100, 104, 20, '?')
		);
	},
	408: () =>
		svg(
			moon(190, 36) + stars([[28, 28], [70, 16], [110, 44], [140, 20], [40, 72], [226, 80], [98, 70]]) + ground + pine(20, 162, 1.2) + pine(214, 156, 1) +
			`<rect x="170" y="66" width="5" height="102" rx="2" fill="${WOOD}"/><path d="M175 66L202 74 175 82Z" fill="${RED}"/><path d="M172 84h-34l-8 7 8 7h34Z" fill="#6e5836"/><circle cx="172" cy="75" r="3.6" fill="${OCHRE}"/>` +
			scout({ x: 156, f: -1, sit: 0, face: 'sleep', tilt: 14, a: [-14, -44], b: [20, -44] }) +
			text(118, 100, 15, 'z') + text(130, 88, 11, 'z') + text(139, 79, 8, 'z')
		),
	410: () => {
		const stones = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${(Math.cos((i * Math.PI) / 4) * 20).toFixed(1)}" cy="${(Math.sin((i * Math.PI) / 4) * 6).toFixed(1)}" r="4" fill="#5a6b60"/>`).join('');
		return svg(
			sky() + ground + pine(22, 162, 1.3) + pine(212, 160, 1.2) + pine(52, 152, 0.8) +
			`<ellipse cx="92" cy="170" rx="46" ry="7" fill="#22402d"/><g fill="none" stroke="${MOSS}" stroke-width="2" stroke-dasharray="5 4"><path d="M58 170L92 124 126 170Z"/><path d="M82 170L92 146 102 170"/></g><g fill="#13241a"><circle cx="58" cy="173" r="1.8"/><circle cx="126" cy="173" r="1.8"/></g>` +
			`<g transform="translate(176 170)"><ellipse rx="24" ry="8" fill="#13241a"/>${stones}<path d="M-8 -1L6 1M-4 2L9 -2" stroke="#2b2118" stroke-width="3" stroke-linecap="round"/></g>` +
			`<path d="M132 108q14 -8 30 0M118 126q12 -6 22 0" fill="none" stroke="${SAND}" stroke-width="1.6" stroke-linecap="round" opacity=".3"/><path d="M146 92q8 -10 18 -2 -4 10 -18 2Z" fill="${OCHRE}" transform="rotate(-20 155 90)"/><path d="M146 92l14 -4" stroke="${WOOD}" stroke-width="1.2" transform="rotate(-20 155 90)"/><path d="M40 104q-4 -8 4 -10 4 8 -4 10Z" fill="${RED}" opacity=".85"/>`
		);
	},
	418: () => {
		const pot = `<g transform="translate(76 124)"><path d="M0 -17V-34" stroke="${STONE}" stroke-width="1.6"/><path d="M-15 -4Q-31 -4 -28 7Q-25 14 -14 9" fill="none" stroke="${SKY}" stroke-width="4"/><path d="M13 -4Q24 -4 27 -17L32 -15Q31 4 14 6Z" fill="${SKY}"/><ellipse rx="19" ry="14" fill="${SKY}"/><path d="M-14 4Q0 12 14 4" fill="none" stroke="#000" opacity=".15" stroke-width="3"/><ellipse cy="-13" rx="10" ry="3.2" fill="${SAND}"/><circle cy="-17" r="2.6" fill="${SAND}"/><path d="M-9 -4q-3 3 -1 8" stroke="${SAND}" stroke-width="2" fill="none" opacity=".6"/></g>`;
		const mug = `<rect x="14" y="-58" width="12" height="12" rx="2" fill="${STONE}"/><path d="M26 -55q6 0 6 4.5t-6 4.5" fill="none" stroke="${STONE}" stroke-width="2.4"/><path d="M17 -62q2 -3 0 -6M23 -62q2 -3 0 -6" stroke="${SAND}" stroke-width="1.4" fill="none" opacity=".6"/>`;
		return svg(
			sky() + ground + pine(210, 160, 1.3) + pine(30, 156, 1) +
			`<path d="M76 90L48 168M76 90L104 168M76 90L76 168" stroke="${WOOD}" stroke-width="3.2" stroke-linecap="round"/>` +
			pot + fire(76, 168, 1.15) + wisp(110, 104, SAND, 0.55) + wisp(116, 98, SAND, 0.4) +
			scout({ x: 168, f: -1, face: 'happy', look: 2, b: [20, -50], hold: mug })
		);
	},
	429: () =>
		svg(
			sky() + ground + pine(210, 160, 1.3) + pine(28, 158, 1.1) + log(54, 112) +
			scout({
				x: 118, s: 1, sit: 14, face: 'tired', b: [14, -76], a: [-18, -48],
				back: `<rect x="-42" y="-104" width="34" height="14" rx="7" fill="${OCHRE}"/><rect x="-44" y="-92" width="34" height="62" rx="9" fill="${RED}"/><rect x="-40" y="-60" width="26" height="20" rx="4" fill="#000" opacity=".15"/><path d="M-30 -92V-30" stroke="#000" opacity=".12" stroke-width="2"/><circle cx="-26" cy="-26" r="6" fill="${STONE}"/>`
			}) +
			drop(130, 100) + drop(86, 94) + drop(138, 118) +
			`<path d="M124 124q4 -3 8 -1M126 130q4 -3 9 0" fill="none" stroke="${SAND}" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>`
		),
	500: () =>
		svg(
			sky() + ground + pine(22, 160, 1.2) + pine(218, 158, 1) +
			`<path d="M112 140V168M188 140V168" stroke="${WOOD}" stroke-width="4"/><rect x="104" y="138" width="92" height="6" rx="2" fill="#6e5836"/><rect x="132" y="130" width="36" height="8" rx="2" fill="#13241a"/>` +
			`<path d="M138 130q2 -7 5 0M148 130q2 -9 5 0M157 130q2 -7 5 0" fill="${RED}" stroke="${RED}" stroke-width="2"/>` +
			`<rect x="130" y="100" width="40" height="30" rx="4" fill="${STONE}"/><rect x="124" y="108" width="8" height="4" rx="2" fill="${STONE}"/><rect x="168" y="108" width="8" height="4" rx="2" fill="${STONE}"/>` +
			`<path d="M132 102v22M168 102v22M150 102v14" stroke="${SAND}" stroke-width="4" stroke-linecap="round"/><g fill="${SAND}"><circle cx="136" cy="99" r="6"/><circle cx="146" cy="96" r="7"/><circle cx="158" cy="97" r="7"/><circle cx="167" cy="100" r="5.5"/></g>` +
			`<ellipse cx="128" cy="86" rx="13" ry="3.5" fill="${STONE}" transform="rotate(-24 128 86)"/>` +
			`<g class="st" fill="#3a4a40" opacity=".85"><circle cx="152" cy="82" r="6"/><circle cx="158" cy="70" r="8"/><circle cx="150" cy="56" r="7"/><circle cx="160" cy="44" r="5"/></g>` +
			scout({
				x: 70, face: 'alarm', a: [-19, -62], b: [20, -60],
				hold: `<path d="M20 -60L30 -84" stroke="${WOOD}" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="-89" r="6" fill="${STONE}"/>`
			}) +
			text(100, 70, 30, '!') + text(88, 52, 16, '!')
		),
	502: () => {
		const bolt = `M52 68l16 -10 12 14 18 -14 8 12` + ' ';
		return svg(
			sky() + ground + pine(86, 164, 0.8) + pine(158, 164, 0.8) +
			mast(32, 168, 104) + mast(208, 168, 104) +
			`<path d="M42 62q6 6 0 12M48 58q9 10 0 20" fill="none" stroke="${OCHRE}" stroke-width="2" stroke-linecap="round"/><path d="M198 62q-6 6 0 12M192 58q-9 10 0 20" fill="none" stroke="${MOSS}" stroke-width="2" stroke-linecap="round" opacity=".5"/>` +
			`<path d="${bolt}" fill="none" stroke="${OCHRE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M146 66l12 14 14 -14 14 10" fill="none" stroke="${MOSS}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>` +
			`<path d="M114 58l12 12M126 58l-12 12" stroke="${RED}" stroke-width="3.4" stroke-linecap="round"/>` +
			scout({ x: 120, s: 0.62, face: 'worried', tilt: 6, look: 1, b: [11, -78] }) + text(138, 102, 18, '?')
		);
	},
	503: () =>
		svg(
			sky() + ground + pine(210, 160, 1.3) + pine(24, 158, 1) + log(30, 90) +
			fire(158, 168, 1.25, false) +
			wisp(154, 128, SAND, 0.35) + wisp(166, 120, SAND, 0.25) +
			scout({
				x: 76, sit: 14, face: 'flat', look: 2,
				hold: `<path d="M18 -40L78 -30" stroke="${WOOD}" stroke-width="2.6" stroke-linecap="round"/><rect x="74" y="-38" width="9" height="13" rx="4" fill="${SAND}" transform="rotate(-10 78 -31)"/>`
			})
		),
	504: () =>
		svg(
			sky() + ground + pine(22, 160, 1.1) + mast(204, 168, 116) +
			`<path d="M194 54q-7 6 0 13M188 50q-11 10 0 21" fill="none" stroke="${OCHRE}" stroke-width="2" stroke-linecap="round"/>` +
			`<path d="M134 168V148h24V168Z" fill="${WOOD}"/><ellipse cx="146" cy="148" rx="12" ry="3" fill="#7a5f38"/>` +
			`<rect x="134" y="120" width="24" height="3.4" rx="1" fill="${OCHRE}"/><rect x="134" y="143" width="24" height="3.4" rx="1" fill="${OCHRE}"/><path d="M137 123.4H155L146 133L155 143H137L146 133Z" fill="${SAND}" opacity=".35"/><path d="M146 133L151 143H141Z" fill="${OCHRE}"/><path d="M141 124h10l-5 6Z" fill="${OCHRE}"/>` +
			scout({
				x: 82, face: 'flat', look: 1.5, b: [14, -80],
				hold: `<rect x="11" y="-98" width="9" height="20" rx="2" fill="#13241a" stroke="${MOSS}" stroke-width="1.5"/><path d="M14 -98v-8" stroke="${MOSS}" stroke-width="1.6"/><circle cx="15.5" cy="-90" r="1.4" fill="${RED}"/><circle cx="14" cy="-78" r="4" fill="#e8c4a0"/>`
			})
		),
	index: () =>
		svg(
			sky() + ground + pine(22, 160, 1.2) + tent(208, 166, 0.75) +
			`<rect x="146" y="52" width="6" height="116" rx="2" fill="${WOOD}"/><circle cx="149" cy="50" r="4" fill="${OCHRE}"/>` +
			`<path d="M152 64h40l8 7-8 7h-40Z" fill="${OCHRE}"/><path d="M146 84h-36l-8 7 8 7h36Z" fill="${MOSS}"/><path d="M152 104h30l8 7-8 7h-30Z" fill="${SKY}"/><path d="M146 124h-28l-8 7 8 7h28Z" fill="${RED}"/>` +
			`<path d="M158 71h30M138 91h-30M158 111h20M138 131h-20" stroke="#000" opacity=".2" stroke-width="2" stroke-linecap="round"/>` +
			scout({ x: 62, face: 'happy', look: 2, b: [24, -76] })
		)
};

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<title>${title} – JotiGlobe</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a140e;color:#f5f1e8;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:30rem;padding:2rem 1.25rem;text-align:center}
svg{max-width:100%;height:auto}
.code{font:700 4.5rem/1 Georgia,serif;color:#7fb48d;margin:.5rem 0 0}
h1{font:600 1.5rem/1.3 Georgia,serif;margin:.25rem 0 .75rem}
p{color:rgba(245,241,232,.75);margin:0 0 1.5rem}
a{color:#f5f1e8}
.btn{display:inline-block;background:#7fb48d;color:#0a140e;font-weight:600;text-decoration:none;padding:.6rem 1.1rem;border-radius:.4rem}
small{display:block;margin-top:1.5rem;color:rgba(245,241,232,.5)}
ul{list-style:none;padding:0;margin:0 0 1.5rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(12rem,1fr));gap:.4rem;text-align:left}
li a{display:block;padding:.45rem .7rem;border:1px solid rgba(255,255,255,.12);border-radius:.4rem;text-decoration:none}
li a:hover{background:rgba(255,255,255,.06)}
li b{color:#7fb48d;margin-right:.35rem}
@media (prefers-reduced-motion:no-preference){.st{animation:st 3s ease-in-out infinite alternate}}
@keyframes st{to{transform:translateY(-4px);opacity:.3}}
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;

export function errorPage(code) {
	const [title, text] = errors[code] ?? ['Something went wrong', 'An unexpected error happened.'];
	return page(
		`${code} ${title}`,
		`${(scenes[code] ?? scenes[code >= 500 ? 500 : 404])()}
<p class="code">${code}</p>
<h1>${title}</h1>
<p>${text}</p>
<a class="btn" href="/">Back to the globe</a>
<small>If you believe this is an error, <a href="${ISSUES}?title=${encodeURIComponent(`${code} on JotiGlobe`)}" rel="noopener noreferrer">open an issue on GitHub</a>.</small>`
	);
}

export function errorIndex() {
	const items = Object.entries(errors)
		.map(([code, [title]]) => `<li><a href="/errors/${code}"><b>${code}</b> ${title}</a></li>`)
		.join('\n');
	return page(
		'Error pages',
		`${scenes.index()}
<h1>Error pages</h1>
<p>Every error JotiGlobe can show. Click one to see it, with its real status code.</p>
<ul>
${items}
</ul>
<a class="btn" href="/">Back to the globe</a>`
	);
}
