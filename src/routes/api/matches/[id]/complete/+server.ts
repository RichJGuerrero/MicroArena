import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { completeArenaMatch, getArenaMatch, getArenaMatchViews } from '$lib/server/store';
import type { ArenaSideKey } from '$lib/types';

// ============================================
// /api/matches/:id/complete
// - POST: mark winner and complete a match
//   V0 rule: only the creator can complete the match
// ============================================

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const id = String(params.id ?? '').trim();
		if (!id) return json({ error: 'Match id is required' }, { status: 400 });

		const body = await request.json();
		const userId = String(body.userId ?? '').trim();
		const winnerSide = String(body.winnerSide ?? '').trim() as ArenaSideKey;
		const scoreA = typeof body.scoreA === 'number' ? body.scoreA : undefined;
		const scoreB = typeof body.scoreB === 'number' ? body.scoreB : undefined;

		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (winnerSide !== 'A' && winnerSide !== 'B') return json({ error: 'winnerSide must be A or B' }, { status: 400 });

		const existing = getArenaMatch(id);
		if (!existing) return json({ error: 'Match not found' }, { status: 404 });
		if (existing.createdBy !== userId) {
			return json({ error: 'Only the match creator can complete this match (V0)' }, { status: 403 });
		}

		completeArenaMatch(id, winnerSide, scoreA, scoreB);
		const view = getArenaMatchViews().find((x) => x.match.id === id) ?? null;
		return json({ match: view?.match ?? null, view });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to complete match';
		return json({ error: message }, { status: 400 });
	}
};
