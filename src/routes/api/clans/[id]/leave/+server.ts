import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { leaveClan, getUser } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { userId } = await request.json();
		
		if (!userId) {
			return json({ error: 'User ID required' }, { status: 400 });
		}
		
		const result = leaveClan(params.id, userId);
		const user = getUser(userId);
		
		return json({ user, disbanded: result.disbanded });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to leave clan' },
			{ status: 400 }
		);
	}
};
