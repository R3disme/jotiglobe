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
	429: ['Too many requests', 'Slow down, scout! Take a breather and try again in a moment.'],
	500: ['Server error', 'Something went wrong in the camp kitchen.'],
	502: ['Bad gateway', 'The message got lost between the radio stations.'],
	503: ['Unavailable', 'The campfire is out for a moment. Try again shortly.'],
	504: ['Gateway timeout', 'The radio relay took too long to answer.']
};

const scout = (mark) => `<svg viewBox="0 0 240 200" width="240" height="200" aria-hidden="true">
<circle cx="190" cy="40" r="16" fill="#f5f1e8" opacity=".85"/>
<path d="M0 170 Q60 150 120 165 T240 160 V200 H0Z" fill="#1b3123"/>
<path d="M22 165 l18-52 18 52Z M34 132 l6-30 6 30Z" fill="#22402d"/>
<path d="M196 162 l16-46 16 46Z M206 132 l6-26 6 26Z" fill="#22402d"/>
<rect x="111" y="128" width="8" height="36" rx="3" fill="#13241a"/><rect x="123" y="128" width="8" height="36" rx="3" fill="#13241a"/>
<path d="M102 88 q19-12 38 0 l6 46 h-50Z" fill="#7fb48d"/>
<path d="M108 86 l13 18 13-18Z" fill="#ecc15a"/>
<circle cx="121" cy="70" r="15" fill="#e8c4a0"/>
<circle cx="116" cy="70" r="1.8" fill="#0e1b14"/><circle cx="126" cy="70" r="1.8" fill="#0e1b14"/>
<path d="M115 78 q6 -3 12 0" stroke="#0e1b14" stroke-width="1.6" fill="none"/>
<path d="M96 60 h50 l-6-4 h-38Z" fill="#5c4a2e"/><path d="M110 56 l11-20 11 20Z" fill="#6e5836"/>
<path d="M146 96 l18 10" stroke="#7fb48d" stroke-width="9" stroke-linecap="round"/>
<rect x="160" y="96" width="28" height="22" rx="2" fill="#f5f1e8" transform="rotate(12 174 107)"/>
<path d="M166 103 l8 6 6-4 6 5" stroke="#5e9bc4" stroke-width="1.5" fill="none" transform="rotate(12 174 107)"/>
<path d="M98 96 l-14 16" stroke="#7fb48d" stroke-width="9" stroke-linecap="round"/>
<circle cx="70" cy="168" r="9" fill="#f5f1e8" stroke="#0e1b14" stroke-width="2"/><path d="M70 161 l3 7 -3 7 -3 -7Z" fill="#e5533d"/>
<text x="150" y="40" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#ecc15a">${mark}</text>
</svg>`;

export function errorPage(code) {
	const [title, text] = errors[code] ?? ['Something went wrong', 'An unexpected error happened.'];
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<title>${code} ${title} – JotiGlobe</title>
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
</style>
</head>
<body>
<main>
${scout(code >= 500 ? '!' : '?')}
<p class="code">${code}</p>
<h1>${title}</h1>
<p>${text}</p>
<a class="btn" href="/">Back to the globe</a>
<small>If you believe this is an error, <a href="${ISSUES}?title=${encodeURIComponent(`${code} on JotiGlobe`)}" rel="noopener noreferrer">open an issue on GitHub</a>.</small>
</main>
</body>
</html>
`;
}
