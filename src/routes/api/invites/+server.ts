import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getInvitesForUser } from '$lib/server/store';

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');
	if (!userId) {
		return json({ error: 'User ID required' }, { status: 400 });
	}

	const invites = getInvitesForUser(userId);
	return json({ invites });
};
