import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { users, clans } from '$lib/server/store';

export const GET: RequestHandler = async ({ url }) => {
	const usernameKeyRaw = url.searchParams.get('usernameKey');

	if (!usernameKeyRaw) {
		return json({ error: 'Missing usernameKey' }, { status: 400 });
	}

	const usernameKey = usernameKeyRaw.trim().toLowerCase();

	const user = users.get(usernameKey);
	if (!user || !user.clan) return json({ clan: null });

	const clan = clans.get(user.clan);
	if (!clan) return json({ clan: null });

	return json({
		clan: {
			tag: clan.tag,
			name: clan.name,
			members: clan.members
		}
	});
};
