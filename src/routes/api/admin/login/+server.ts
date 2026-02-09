import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminKey, setAdminSession } from '$lib/server/admin';
import { createAuditEvent } from '$lib/server/store';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const key = (body?.key ?? '').toString().trim();
		if (!key) return json({ error: 'Key required' }, { status: 400 });

		if (key !== getAdminKey()) {
			return json({ error: 'Invalid key' }, { status: 403 });
		}

		setAdminSession(cookies);
		try {
			createAuditEvent({
				action: 'ADMIN_LOGIN',
				actorUserId: null,
				targetUserId: null,
				matchId: null,
				clanId: null,
				note: 'Admin session granted'
			});
		} catch {
			// ignore audit failures
		}
		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Login failed' },
			{ status: 500 }
		);
	}
};
