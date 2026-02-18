import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUserBanned, readyUpArenaMatch } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { userId } = await request.json();
		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (isUserBanned(userId)) return json({ error: 'BANNED' }, { status: 403 });
		const match = readyUpArenaMatch(params.id, userId);
		return json({ match });
	} catch (e: any) {
		return json({ error: e?.message ?? 'Failed to ready up' }, { status: 400 });
	}
};
