import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClanInvite } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { inviterId, username } = body as { inviterId?: string; username?: string };

		if (!inviterId || !username) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const invite = createClanInvite({
			clanId: params.id,
			inviterId,
			inviteeUsername: username
		});

		return json({ invite }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to invite' },
			{ status: 400 }
		);
	}
};
