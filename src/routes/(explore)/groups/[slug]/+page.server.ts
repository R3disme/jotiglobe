import { error } from '@sveltejs/kit';
import { groupKeyFromPath, groupPath } from '#lib/data.ts';
import { allGroups, groupView } from '#lib/server/data.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => allGroups().map((g) => ({ slug: groupPath(g).slice('/groups/'.length) }));

export const load: PageServerLoad = ({ params }) => {
	const key = groupKeyFromPath(`/groups/${params.slug}`);
	const view = key == null ? null : groupView(key);
	if (!view) error(404, 'This group isn’t in any of the JOTA-JOTI years we have.');
	return view;
};
