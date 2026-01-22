import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { respondToArenaChallenge, getArenaMatchViews } from '$lib/server/store';

// ============================================
// /api/matches/:id/respond
// - POST: accept or decline a direct challenge
// ============================================

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const id = String(params.id ?? '').trim();
		if (!id) return json({ error: 'Match id is required' }, { status: 400 });

		const body = await request.json();
		const userId = String(body.userId ?? '').trim();
		const action = String(body.action ?? '').trim().toUpperCase();
		const accept = action === 'ACCEPT';

		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (action !== 'ACCEPT' && action !== 'DECLINE') {
			return json({ error: 'action must be ACCEPT or DECLINE' }, { status: 400 });
		}

		respondToArenaChallenge(id, userId, accept);
		const view = getArenaMatchViews().find((x) => x.match.id === id) ?? null;
		return json({ match: view?.match ?? null, view });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to respond to challenge';
		return json({ error: message }, { status: 400 });
	}
};
