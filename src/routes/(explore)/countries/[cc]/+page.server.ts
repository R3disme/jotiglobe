import { error } from '@sveltejs/kit';
import { allCountries, countryView } from '#lib/server/data.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => allCountries().map((cc) => ({ cc }));

export const load: PageServerLoad = ({ params }) => {
	const country = countryView(params.cc.toUpperCase());
	if (!country) error(404, 'No scout groups from this country in the JOTA-JOTI years we have.');
	return { country };
};
