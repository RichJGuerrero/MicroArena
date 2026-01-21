import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { respondToClanInvite, respondToArenaChallenge } from '$lib/server/store';
import type { InboxItemType } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const userId: string | undefined = body.userId;
		const type: InboxItemType | undefined = body.type;
		const id: string | undefined = body.id;
		const accept: boolean = !!body.accept;

		if (!userId || !type || !id) {
			return json({ error: 'userId, type, and id are required' }, { status: 400 });
		}

		if (type === 'CLAN_INVITE') {
			respondToClanInvite(id, userId, accept);
			return json({ success: true });
		}

		if (type === 'MATCH_CHALLENGE') {
			respondToArenaChallenge(id, userId, accept);
			return json({ success: true });
		}

		return json({ error: 'Unknown inbox item type' }, { status: 400 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to respond' },
			{ status: 400 }
		);
	}
};
