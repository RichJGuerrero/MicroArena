import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { adminForceDisputeArenaMatch, createAuditEvent } from '$lib/server/store';

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	try {
		requireAdmin(cookies);
		const id = String(params.id ?? '').trim();
		if (!id) return json({ success: false, error: 'Match id required' }, { status: 400 });
		const body = await request.json().catch(() => ({}));
		const disputeReason = String(body?.disputeReason ?? '').trim() || 'Admin forced dispute';

		const match = adminForceDisputeArenaMatch(id, { disputeReason });
		createAuditEvent({
			action: 'ADMIN_FORCE_DISPUTE',
			actorUserId: null,
			targetUserId: null,
			matchId: match.id,
			clanId: match.scope === 'CLAN' ? (match.teamA.clanId ?? match.teamB.clanId ?? null) : null,
			note: disputeReason
		});
		return json({ success: true, data: match });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to force dispute';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
