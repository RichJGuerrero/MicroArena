import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { getAuditEvents } from '$lib/server/store';

export const GET: RequestHandler = async ({ cookies, url }) => {
	try {
		requireAdmin(cookies);
		const limitRaw = Number(url.searchParams.get('limit') ?? '100');
		const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 100;
		return json({ success: true, data: getAuditEvents(limit) });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Failed to load audit';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
