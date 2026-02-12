import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin';
import { getAllUsers } from '$lib/server/store';

// Admin user search. Query:
//  - q: substring of username (case-insensitive)
//  - limit: default 50 (max 200)
export const GET: RequestHandler = async ({ cookies, url }) => {
	try {
		requireAdmin(cookies);
		const qRaw = String(url.searchParams.get('q') ?? '').trim();
		const q = qRaw.toLowerCase();
		const limitRaw = Number(url.searchParams.get('limit') ?? 50);
		const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 200) : 50;

		let list = getAllUsers();
		if (q) {
			list = list.filter((u) => u.username.toLowerCase().includes(q) || u.usernameKey?.includes(q));
		}
		// Most recent signups first
		list = list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

		// Return only what's needed for admin UI.
		const data = list.slice(0, limit).map((u) => ({
			id: u.id,
			username: u.username,
			usernameKey: u.usernameKey,
			clanId: u.clanId ?? null,
			banned: Boolean(u.banned),
			bannedReason: u.bannedReason ?? null,
			bannedAt: u.bannedAt ?? null,
			createdAt: u.createdAt
		}));
		return json({ success: true, data });
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Unauthorized';
		const status = msg === 'ADMIN_REQUIRED' ? 401 : 500;
		return json({ success: false, error: msg }, { status });
	}
};
