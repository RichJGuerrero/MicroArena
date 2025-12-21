import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByUsername } from '$lib/server/store';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { username } = await request.json();
		
		if (!username) {
			return json({ error: 'Username required' }, { status: 400 });
		}
		
		const user = getUserByUsername(username);
		
		if (!user) {
			return json({ error: 'User not found' }, { status: 404 });
		}
		
		return json({ user });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Login failed' },
			{ status: 500 }
		);
	}
};
