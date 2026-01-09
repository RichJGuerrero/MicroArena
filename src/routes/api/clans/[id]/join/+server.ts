import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { joinClan, getUser, getClanWithMembers } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { userId } = await request.json();
		
		if (!userId) {
			return json({ error: 'User ID required' }, { status: 400 });
		}
		
		joinClan(params.id, userId);
		
		const user = getUser(userId);
		const clan = getClanWithMembers(params.id);
		
		return json({ user, clan });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to join clan' },
			{ status: 400 }
		);
	}
};
