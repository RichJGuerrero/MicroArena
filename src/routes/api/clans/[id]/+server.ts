import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClan, getClanByTag, getClanWithMembers, updateClan, getBeefMatchesForClan, getClanStats, getRecentMatchesForClan } from '$lib/server/store';

export const GET: RequestHandler = async ({ params }) => {
	// Try to get by ID first, then by tag
	let clanId = params.id;
	let clan = getClan(clanId);
	
	if (!clan) {
		// Try as tag
		const clanByTag = getClanByTag(params.id);
		if (clanByTag) {
			clanId = clanByTag.id;
			clan = clanByTag;
		}
	}
	
	if (!clan) {
		return json({ error: 'Clan not found' }, { status: 404 });
	}
	
	const clanWithMembers = getClanWithMembers(clanId);
	const beefMatches = getBeefMatchesForClan(clanId);
	const clanStats = getClanStats(clanId);
	const recentMatches = getRecentMatchesForClan(clanId, 5);
	
	return json({ clan: clanWithMembers, beefMatches, clanStats, recentMatches });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const clan = updateClan(params.id, body);
		
		if (!clan) {
			return json({ error: 'Clan not found' }, { status: 404 });
		}
		
		return json({ clan });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Update failed' },
			{ status: 400 }
		);
	}
};
