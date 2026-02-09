import type { Cookies } from '@sveltejs/kit';

const ADMIN_COOKIE = 'ma_admin';

export function isAdmin(cookies: Cookies): boolean {
	return cookies.get(ADMIN_COOKIE) === '1';
}

export function requireAdmin(cookies: Cookies): void {
	if (!isAdmin(cookies)) {
		throw new Error('ADMIN_REQUIRED');
	}
}

export function setAdminSession(cookies: Cookies): void {
	cookies.set(ADMIN_COOKIE, '1', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 8
	});
}

export function clearAdminSession(cookies: Cookies): void {
	cookies.delete(ADMIN_COOKIE, { path: '/' });
}

export function getAdminKey(): string {
	// V0 safety: allow a dev default so local testing works out of the box.
	// For anything public-facing, set ADMIN_KEY in your environment.
	return (process.env.ADMIN_KEY ?? '').trim() || 'dev';
}
