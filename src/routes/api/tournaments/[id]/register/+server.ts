import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerForTournament, getTournament, getTournamentTeams } from '$lib/server/store';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { clanId, userId } = await request.json();
		
		if (!clanId || !userId) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		registerForTournament(params.id, clanId, userId);
		
		const tournament = getTournament(params.id);
		const teams = getTournamentTeams(params.id);
		
		return json({ tournament, teams });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Registration failed' },
			{ status: 400 }
		);
	}
};
