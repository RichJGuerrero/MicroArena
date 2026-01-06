import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser, updateUser, getUserStats, getClan, getRecentMatchesForUser } from '$lib/server/store';

export const GET: RequestHandler = async ({ params }) => {
	const user = getUser(params.id);
	
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}
	
	const stats = getUserStats(user.id);
	const clan = user.clanId ? getClan(user.clanId) : null;
	const recentMatches = getRecentMatchesForUser(user.id, 5);
	
	return json({ 
		user,
		stats,
		clan,
		recentMatches,
		isFounder: clan ? clan.founderId === user.id : false
	});
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const user = updateUser(params.id, body);
		
		if (!user) {
			return json({ error: 'User not found' }, { status: 404 });
		}
		
		return json({ user });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Update failed' },
			{ status: 400 }
		);
	}
};
