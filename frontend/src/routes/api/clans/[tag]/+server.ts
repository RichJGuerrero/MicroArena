import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clans } from '$lib/server/store';

export const GET: RequestHandler = async ({ params }) => {
	const tagKey = params.tag?.toLowerCase();

	if (!tagKey) {
		return json({ error: 'Missing clan tag' }, { status: 400 });
	}

	const clan = clans.get(tagKey);
	if (!clan) {
		return json({ error: 'Clan not found' }, { status: 404 });
	}

	return json({
		clan: {
			tag: clan.tag,
			name: clan.name,
			members: clan.members,
			integrity: clan.integrity ?? 100
		}
	});
};
