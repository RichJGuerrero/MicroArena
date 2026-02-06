import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/admin';

export const GET: RequestHandler = async ({ cookies }) => {
	return json({ isAdmin: isAdmin(cookies) });
};
