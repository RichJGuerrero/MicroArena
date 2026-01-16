import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createArenaMatch, getArenaMatchViews } from '$lib/server/store';
import type { MatchQueue, MatchScope, BeefMatch } from '$lib/types';

// ============================================
// /api/matches
// - GET: list match-board matches (open + direct challenges)
// - POST: create a new match (open or direct challenge)
// ============================================

export const GET: RequestHandler = async () => {
	return json({ matches: getArenaMatchViews() });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		const visibility = (body.visibility ?? 'OPEN') as 'OPEN' | 'DIRECT';
		const scope = (body.scope ?? 'PLAYER') as MatchScope;
		const format = (body.format ?? '1v1') as BeefMatch['format'];
		const queue = (body.queue ?? 'RANKED') as MatchQueue;
		const ruleset = String(body.ruleset ?? 'Standard Rules').trim();
		const createdBy = String(body.createdBy ?? '').trim();
		const target = typeof body.target === 'string' ? body.target : undefined;
		const refRequired = typeof body.refRequired === 'boolean' ? body.refRequired : undefined;
		const streamRequired = typeof body.streamRequired === 'boolean' ? body.streamRequired : undefined;
		const scheduledTime = typeof body.scheduledTime === 'number' ? body.scheduledTime : undefined;

		if (!createdBy) {
			return json({ error: 'createdBy is required' }, { status: 400 });
		}
		if (!ruleset) {
			return json({ error: 'ruleset is required' }, { status: 400 });
		}

		const match = createArenaMatch({
			visibility,
			scope,
			format,
			queue,
			ruleset,
			createdBy,
			target,
			refRequired,
			streamRequired,
			scheduledTime
		});

		return json({ match });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to create match';
		return json({ error: message }, { status: 400 });
	}
};
