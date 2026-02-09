import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { createAuditEvent, createIntegrityEvent } from '$lib/server/store';
import type { IntegrityEventType } from '$lib/types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		requireAdmin(cookies);
		const body = await request.json();
		const targetUserId = (body?.targetUserId ?? '').toString().trim();
		if (!targetUserId) return json({ success: false, error: 'targetUserId is required' }, { status: 400 });
		const type = (body?.type ?? 'UNSPORTSMANLIKE') as IntegrityEventType;
		const severityRaw = Number(body?.severity ?? 1);
		const severity = Number.isFinite(severityRaw) ? Math.max(1, Math.min(5, severityRaw)) : 1;
		const description = (body?.description ?? '').toString().trim() || 'Admin integrity action';
		const matchId = (body?.matchId ?? '').toString().trim() || undefined;

		const ev = createIntegrityEvent({
			targetUserId,
			reportedBy: 'ADMIN',
			type,
			severity,
			description,
			matchId
		});
		try {
			createAuditEvent({
				action: 'ADMIN_INTEGRITY',
				actorUserId: null,
				targetUserId,
				matchId: matchId ?? null,
				clanId: null,
				note: `${type} (sev ${severity}): ${description}`
			});
		} catch {
			// ignore
		}

		return json({ success: true, data: ev });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to apply integrity';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
