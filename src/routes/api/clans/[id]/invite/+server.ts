import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClanInvite, getClanWithMembers } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { fromUserId, targetUsername } = await request.json();

		if (!fromUserId || !targetUsername) {
			return json({ error: 'fromUserId and targetUsername are required' }, { status: 400 });
		}

		const invite = createClanInvite({
			clanId: params.id,
			fromUserId,
			targetUsername
		});

		const clan = getClanWithMembers(params.id);
		return json({ invite, clan });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to send invite' },
			{ status: 400 }
		);
	}
};
