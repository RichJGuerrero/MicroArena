import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser, createUser, updateUser, getUserByUsername } from '$lib/server/store';

// Sync Auth0 user with our database
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { id, email, name, picture } = body;
		
		if (!id || !email) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		let user = getUser(id);
		
		if (user) {
			// Update existing user
			user = updateUser(id, {
				email,
				avatar: picture || user.avatar
			});
		} else {
			// Create new user - generate username from email
			const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
			let username = baseUsername;
			let counter = 1;
			
			// Ensure unique username
			while (getUserByUsername(username)) {
				username = `${baseUsername}${counter}`;
				counter++;
			}
			
			user = createUser({
				id,
				email,
				username,
				avatar: picture
			});
		}
		
		return json({ user });
	} catch (error) {
		console.error('Auth sync error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Sync failed' },
			{ status: 500 }
		);
	}
};
