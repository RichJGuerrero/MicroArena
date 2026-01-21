import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { respondToArenaChallenge } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const userId = String(body.userId ?? '').trim();
		const action = String(body.action ?? '').toUpperCase();

		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (action !== 'ACCEPT' && action !== 'DECLINE') {
			return json({ error: 'action must be ACCEPT or DECLINE' }, { status: 400 });
		}

		const match = respondToArenaChallenge(params.id, userId, action === 'ACCEPT');
		return json({ match });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to respond to challenge';
		return json({ error: message }, { status: 400 });
	}
};
