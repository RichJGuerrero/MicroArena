import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { users, clans } from '$lib/server/store';

export const GET: RequestHandler = async ({ params }) => {
	const usernameKey = params.username?.toLowerCase();

	if (!usernameKey) {
		return json({ error: 'Missing username' }, { status: 400 });
	}

	const user = users.get(usernameKey);
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	let clanInfo = null;

	if (user.clan) {
		const clan = clans.get(user.clan);
		if (clan) {
			clanInfo = {
				tag: clan.tag,
				name: clan.name
			};
		}
	}

	return json({
		user: {
			username: user.username ?? usernameKey,
			usernameKey,
			clan: clanInfo
		}
	});
};
