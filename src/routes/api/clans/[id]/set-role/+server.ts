import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setClanMemberRole } from '$lib/server/store';
import type { ClanRole } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { actorId, targetUserId, role } = body as {
			actorId?: string;
			targetUserId?: string;
			role?: ClanRole;
		};

		if (!actorId || !targetUserId || !role) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (role !== 'LEADER' && role !== 'SOLDIER') {
			return json({ error: 'Invalid role' }, { status: 400 });
		}

		const result = setClanMemberRole({ clanId: params.id, actorId, targetUserId, role });
		return json({ result }, { status: 200 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to set role' },
			{ status: 400 }
		);
	}
};
