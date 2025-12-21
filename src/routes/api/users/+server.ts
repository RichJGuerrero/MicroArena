import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllUsers } from '$lib/server/store';

export const GET: RequestHandler = async () => {
	const users = getAllUsers();
	return json({ users });
};
