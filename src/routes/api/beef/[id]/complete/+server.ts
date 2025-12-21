import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { completeBeefMatch, getBeefMatch } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { winnerId, challengerScore, challengedScore } = await request.json();
		
		if (!winnerId || challengerScore === undefined || challengedScore === undefined) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		completeBeefMatch(params.id, winnerId, challengerScore, challengedScore);
		const updated = getBeefMatch(params.id);
		
		return json({ beefMatch: updated });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to complete match' },
			{ status: 400 }
		);
	}
};
