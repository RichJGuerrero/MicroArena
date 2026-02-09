import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getArenaMatch, getArenaMatchViews, isUserBanned, reportArenaMatchResult } from '$lib/server/store';
import type { ArenaSideKey } from '$lib/types';

// ============================================
// /api/matches/:id/report
// - POST: a match participant reports which side won (A or B)
// - If both teams report the same winner, the match auto-completes.
// - If reports conflict, the match becomes DISPUTED.
// ============================================

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const id = String(params.id ?? '').trim();
		if (!id) return json({ error: 'Match id is required' }, { status: 400 });

		const body = await request.json();
		const userId = String(body.userId ?? '').trim();
		const winnerSide = String(body.winnerSide ?? '').trim() as ArenaSideKey;

		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (isUserBanned(userId)) return json({ error: 'BANNED' }, { status: 403 });
		if (winnerSide !== 'A' && winnerSide !== 'B') {
			return json({ error: 'winnerSide must be A or B' }, { status: 400 });
		}

		const existing = getArenaMatch(id);
		if (!existing) return json({ error: 'Match not found' }, { status: 404 });

		reportArenaMatchResult(id, userId, winnerSide);
		const view = getArenaMatchViews().find((x) => x.match.id === id) ?? null;
		return json({ match: view?.match ?? null, view });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to report match result';
		return json({ error: message }, { status: 400 });
	}
};
