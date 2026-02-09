import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearAdminSession } from '$lib/server/admin';
import { createAuditEvent } from '$lib/server/store';

export const POST: RequestHandler = async ({ cookies }) => {
	clearAdminSession(cookies);
	try {
		createAuditEvent({
			action: 'ADMIN_LOGOUT',
			actorUserId: null,
			targetUserId: null,
			matchId: null,
			clanId: null,
			note: 'Admin session cleared'
		});
	} catch {
		// ignore
	}
	return json({ success: true });
};
