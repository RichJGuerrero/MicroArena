import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { kickClanMember } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { actorId, targetUserId } = body as { actorId?: string; targetUserId?: string };

		if (!actorId || !targetUserId) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const result = kickClanMember({ clanId: params.id, actorId, targetUserId });
		return json({ result }, { status: 200 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to kick member' },
			{ status: 400 }
		);
	}
};
