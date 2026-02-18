import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { createAuditEvent, runArenaMatchRefAssist } from '$lib/server/store';

// POST /api/admin/matches/:id/ai
// Runs AI ref-assist on the match evidence bundle and stores the result on match.aiAssist.
// NOTE: This does NOT make any decisions. It's a triage helper only.

export const POST: RequestHandler = async ({ cookies, params }) => {
	try {
		requireAdmin(cookies);
		const id = (params.id ?? '').trim();
		if (!id) return json({ success: false, error: 'Match id required' }, { status: 400 });

		const updated = await runArenaMatchRefAssist(id);
		try {
			createAuditEvent({
				action: 'ADMIN_AI_ASSIST',
				actorUserId: null,
				targetUserId: null,
				matchId: id,
				clanId: null,
				note: `AI assist ran (${(updated as any)?.aiAssist?.provider ?? 'UNKNOWN'})`
			});
		} catch {
			// ignore
		}

		return json({ success: true, data: updated });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to run AI assist';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
