import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLadderForTabV2, type LadderTab } from '$lib/server/store';

const TAB_MAP: Record<string, LadderTab> = {
	singles: 'SINGLES',
	doubles: 'DOUBLES',
	team: 'TEAM',
	clans: 'CLANS'
};

export const GET: RequestHandler = async ({ url }) => {
	const tabKey = (url.searchParams.get('tab') || 'clans').toLowerCase();
	const tab: LadderTab = TAB_MAP[tabKey] ?? 'CLANS';

	const result = getLadderForTabV2(tab);
	return json({ tab: tabKey, mode: result.mode, ladder: result.ladder });
};
