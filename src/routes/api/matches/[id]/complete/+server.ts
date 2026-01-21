import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { completeArenaMatch } from '$lib/server/store';
import type { ArenaSideKey } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const winnerSide = (body.winnerSide ?? 'A') as ArenaSideKey;
		const scoreA = typeof body.scoreA === 'number' ? body.scoreA : undefined;
		const scoreB = typeof body.scoreB === 'number' ? body.scoreB : undefined;

		if (winnerSide !== 'A' && winnerSide !== 'B') {
			return json({ error: 'winnerSide must be A or B' }, { status: 400 });
		}

		const match = completeArenaMatch(params.id, winnerSide, scoreA, scoreB);
		return json({ match });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to complete match';
		return json({ error: message }, { status: 400 });
	}
};
