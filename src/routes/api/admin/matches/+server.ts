import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { getArenaMatchViews } from '$lib/server/store';

// Admin list/search of arena matches (all statuses), for ref workflows + testing.
// Query:
//  - status: optional ArenaMatch['status']
//  - q: optional search substring (id, clan tag/name, player username)
//  - limit: optional number (default 50, max 200)
export const GET: RequestHandler = async ({ cookies, url }) => {
	try {
		requireAdmin(cookies);
		const status = String(url.searchParams.get('status') ?? '').trim();
		const qRaw = String(url.searchParams.get('q') ?? '').trim();
		const q = qRaw.toLowerCase();
		const limitRaw = Number(url.searchParams.get('limit') ?? 50);
		const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 200) : 50;

		let views = getArenaMatchViews();
		if (status) {
			views = views.filter((v) => v.match.status === status);
		}
		if (q) {
			views = views.filter((v) => {
				if (v.match.id.toLowerCase().includes(q)) return true;
				if ((v.teamAClan?.tagKey ?? '').includes(q) || (v.teamBClan?.tagKey ?? '').includes(q)) return true;
				if ((v.teamAClan?.name ?? '').toLowerCase().includes(q) || (v.teamBClan?.name ?? '').toLowerCase().includes(q)) return true;
				if (v.teamAPlayers.some((p) => p.username.toLowerCase().includes(q))) return true;
				if (v.teamBPlayers.some((p) => p.username.toLowerCase().includes(q))) return true;
				return false;
			});
		}
		return json({ success: true, data: views.slice(0, limit) });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Unauthorized';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
