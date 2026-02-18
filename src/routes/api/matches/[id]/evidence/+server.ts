import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addArenaMatchEvidence, removeArenaMatchEvidence, getArenaMatch, getArenaMatchViews, isUserBanned } from '$lib/server/store';
import { validateEvidenceUrl } from '$lib/server/evidence';

// ============================================
// /api/matches/:id/evidence
// - POST: add an evidence link (URL + optional note) for the user's side
// - DELETE: remove an evidence item (only the user who added it)
// ============================================

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const id = String(params.id ?? '').trim();
		if (!id) return json({ error: 'Match id is required' }, { status: 400 });

		const body = await request.json();
		const userId = String(body.userId ?? '').trim();
		const url = String(body.url ?? '').trim();
		const note = body.note == null ? null : String(body.note);

		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (isUserBanned(userId)) return json({ error: 'BANNED' }, { status: 403 });
		if (!url) return json({ error: 'url is required' }, { status: 400 });

		// Validate early for clean error messaging.
		const { normalizedUrl } = validateEvidenceUrl(url);

		const existing = getArenaMatch(id);
		if (!existing) return json({ error: 'Match not found' }, { status: 404 });

		addArenaMatchEvidence(id, userId, normalizedUrl, note);
		const view = getArenaMatchViews().find((x) => x.match.id === id) ?? null;
		return json({ match: view?.match ?? null, view });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to add evidence';
		return json({ error: message }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const id = String(params.id ?? '').trim();
		if (!id) return json({ error: 'Match id is required' }, { status: 400 });

		const body = await request.json();
		const userId = String(body.userId ?? '').trim();
		const evidenceId = String(body.evidenceId ?? '').trim();

		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		if (isUserBanned(userId)) return json({ error: 'BANNED' }, { status: 403 });
		if (!evidenceId) return json({ error: 'evidenceId is required' }, { status: 400 });

		const existing = getArenaMatch(id);
		if (!existing) return json({ error: 'Match not found' }, { status: 404 });

		removeArenaMatchEvidence(id, userId, evidenceId);
		const view = getArenaMatchViews().find((x) => x.match.id === id) ?? null;
		return json({ match: view?.match ?? null, view });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to remove evidence';
		return json({ error: message }, { status: 400 });
	}
};
