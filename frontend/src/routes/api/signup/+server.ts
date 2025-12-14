import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { users } from '$lib/server/store';

export async function POST({ request }) {
	const { username, password } = await request.json();

	if (!username || !password) {
		return json({ error: 'Missing fields' }, { status: 400 });
	}

	const rawUsername = username.trim();
	const usernameKey = rawUsername.toLowerCase();

	if (users.has(usernameKey)) {
		return json({ error: 'Username already taken' }, { status: 409 });
	}

	const hash = await bcrypt.hash(password, 10);

	users.set(usernameKey, {
		username: rawUsername,
		usernameKey,
		password: hash,
		integrity: 100,
		clan: null,
		createdAt: Date.now()
	});

	return json({ success: true, username: rawUsername, usernameKey });
}
