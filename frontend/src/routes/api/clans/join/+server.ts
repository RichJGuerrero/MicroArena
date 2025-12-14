import { json } from '@sveltejs/kit';
import { users, clans } from '$lib/server/store';

export async function POST({ request }) {
	const { usernameKey, tag } = await request.json();

	if (!usernameKey || !tag) {
		return json({ error: 'Missing fields' }, { status: 400 });
	}

	const tagKey = String(tag).trim().toLowerCase();

	const user = users.get(usernameKey);
	const clan = clans.get(tagKey);

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	if (!clan) {
		return json({ error: 'Clan not found' }, { status: 404 });
	}

	if (user.clan) {
		return json({ error: 'User already in a clan' }, { status: 409 });
	}

	if (!clan.members.includes(usernameKey)) {
		clan.members.push(usernameKey);
	}

	user.clan = tagKey;

	return json({ success: true });
}
