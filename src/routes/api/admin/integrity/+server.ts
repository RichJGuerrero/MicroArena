import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { createIntegrityEvent } from '$lib/server/store';
import type { IntegrityEventType } from '$lib/types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		requireAdmin(cookies);
		const body = await request.json();
		const targetUserId = (body?.targetUserId ?? '').toString().trim();
		const type = body?.type as IntegrityEventType;
		const severity = Math.max(1, Math.min(5, Number(body?.severity ?? 1)));
		const description = (body?.description ?? '').toString().trim() || 'Admin action';
		const matchId = (body?.matchId ?? '').toString().trim() || null;
		if (!targetUserId) return json({ success: false, error: 'targetUserId required' }, { status: 400 });
		if (!type) return json({ success: false, error: 'type required' }, { status: 400 });

		const ev = createIntegrityEvent({
			targetUserId,
			type,
			severity,
			description,
			reportedBy: 'ADMIN',
			matchId
		});

		return json({ success: true, data: ev });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to apply integrity';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
