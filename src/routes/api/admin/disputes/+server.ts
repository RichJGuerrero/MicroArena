import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { getArenaMatchViews } from '$lib/server/store';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		requireAdmin(cookies);
		const views = getArenaMatchViews().filter((v) => v.match.status === 'DISPUTED');
		return json({ success: true, data: views });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Unauthorized';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
