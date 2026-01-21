import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { joinArenaMatch } from '$lib/server/store';
import type { ArenaSideKey } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const userId = String(body.userId ?? '').trim();
		const side = (body.side ?? 'A') as ArenaSideKey;
		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (side !== 'A' && side !== 'B') return json({ error: 'side must be A or B' }, { status: 400 });

		const match = joinArenaMatch(params.id, userId, side);
		return json({ match });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to join match';
		return json({ error: message }, { status: 400 });
	}
};
