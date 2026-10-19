import { summary } from '#lib/server/data.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ summary: summary() });
