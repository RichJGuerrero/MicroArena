import { json } from '@sveltejs/kit';
import { users, clans } from '$lib/server/store';

export async function POST({ request }) {
	const { usernameKey } = await request.json();

	if (!usernameKey) {
		return json({ error: 'Missing fields' }, { status: 400 });
	}

	const user = users.get(usernameKey);

	if (!user || !user.clan) {
		return json({ error: 'User not in a clan' }, { status: 400 });
	}

	const clan = clans.get(user.clan);

	if (clan) {
		clan.members = clan.members.filter((m) => m !== usernameKey);
	}

	user.clan = null;

	return json({ success: true });
}
