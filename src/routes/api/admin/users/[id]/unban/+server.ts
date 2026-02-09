import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { unbanUser } from '$lib/server/store';

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	try {
		requireAdmin(cookies);
		const targetUserId = String(params.id ?? '').trim();
		if (!targetUserId) return json({ success: false, error: 'User id required' }, { status: 400 });
		let note: string | null = null;
		try {
			const body = await request.json();
			note = (body?.note ?? '').toString().trim() || null;
		} catch {
			// ignore
		}
		const u = unbanUser({ targetUserId, actorUserId: null, note });
		return json({ success: true, data: { id: u.id, banned: u.banned, bannedReason: u.bannedReason, bannedAt: u.bannedAt } });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to unban user';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
