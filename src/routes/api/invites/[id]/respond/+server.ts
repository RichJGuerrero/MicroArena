import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { respondToClanInvite } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { userId, action } = body as { userId?: string; action?: 'ACCEPT' | 'DECLINE' };

		if (!userId || (action !== 'ACCEPT' && action !== 'DECLINE')) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const invite = respondToClanInvite({
			inviteId: params.id,
			userId,
			accept: action === 'ACCEPT'
		});

		return json({ invite });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to respond' },
			{ status: 400 }
		);
	}
};
