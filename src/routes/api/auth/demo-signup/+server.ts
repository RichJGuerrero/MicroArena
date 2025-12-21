import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUser, getUserByUsername, getUserByEmail, generateId } from '$lib/server/store';
import { normalizeUsername } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { username, email } = await request.json();
		
		if (!username || !email) {
			return json({ error: 'Username and email required' }, { status: 400 });
		}
		
		// Validate username
		const normalized = normalizeUsername(username);
		if (normalized.length < 3 || normalized.length > 20) {
			return json({ error: 'Username must be 3-20 characters' }, { status: 400 });
		}
		
		// Check if username taken
		if (getUserByUsername(username)) {
			return json({ error: 'Username already taken' }, { status: 400 });
		}
		
		// Check if email taken
		if (getUserByEmail(email)) {
			return json({ error: 'Email already registered' }, { status: 400 });
		}
		
		// Create user with generated ID (demo mode)
		const user = createUser({
			id: `demo_${generateId()}`,
			email,
			username
		});
		
		return json({ user }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Signup failed' },
			{ status: 500 }
		);
	}
};
