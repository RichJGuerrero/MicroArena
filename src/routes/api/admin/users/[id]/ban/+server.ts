import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { banUser } from '$lib/server/store';

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	try {
		requireAdmin(cookies);
		const targetUserId = String(params.id ?? '').trim();
		if (!targetUserId) return json({ success: false, error: 'User id required' }, { status: 400 });
		const body = await request.json();
		const reason = String(body?.reason ?? '').trim() || 'Banned by admin';
		const matchId = String(body?.matchId ?? '').trim() || null;

		const user = banUser({ targetUserId, reason, actorUserId: null, matchId });
		return json({ success: true, data: user });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to ban user';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
