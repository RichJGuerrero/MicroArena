import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getInboxForUser } from '$lib/server/store';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const userId = url.searchParams.get('userId');
		if (!userId) {
			return json({ error: 'User ID required' }, { status: 400 });
		}

		const items = getInboxForUser(userId);
		return json({ items });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to load inbox' },
			{ status: 400 }
		);
	}
};
