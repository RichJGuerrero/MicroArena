import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { userId } = await request.json();
		
		if (!userId) {
			return json({ error: 'User ID required' }, { status: 400 });
		}

		// Clans are invite-only now (CMG/GB style).
		// Joining happens by accepting a clan invite from the Inbox.
		const user = getUser(userId);
		return json(
			{
				error: 'Invite-only. You must be invited by the clan founder. Check your Inbox.',
				user
			},
			{ status: 403 }
		);
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to join clan' },
			{ status: 400 }
		);
	}
};
