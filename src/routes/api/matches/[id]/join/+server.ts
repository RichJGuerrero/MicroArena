import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
<<<<<<< HEAD
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
=======
import { joinArenaMatch, getArenaMatchViews } from '$lib/server/store';
import type { ArenaSideKey } from '$lib/types';

// ============================================
// /api/matches/:id/join
// - POST: join a match on Team A or Team B
// ============================================

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const id = String(params.id ?? '').trim();
		if (!id) return json({ error: 'Match id is required' }, { status: 400 });

		const body = await request.json();
		const userId = String(body.userId ?? '').trim();
		const side = String(body.side ?? '').trim() as ArenaSideKey;

		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (side !== 'A' && side !== 'B') return json({ error: 'side must be A or B' }, { status: 400 });

		joinArenaMatch(id, userId, side);
		const view = getArenaMatchViews().find((x) => x.match.id === id) ?? null;
		return json({ match: view?.match ?? null, view });
>>>>>>> 393556e65ae20a7804eb4ab3df59bee6f1b2e3bd
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to join match';
		return json({ error: message }, { status: 400 });
	}
};
