import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { respondToBeefMatch, getBeefMatch } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { accept, userId } = await request.json();
		
		if (typeof accept !== 'boolean' || !userId) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		const beef = respondToBeefMatch(params.id, accept, userId);
		const updated = getBeefMatch(params.id);
		
		return json({ beefMatch: updated });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to respond' },
			{ status: 400 }
		);
	}
};
