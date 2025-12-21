import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTournament, getTournamentTeams } from '$lib/server/store';

export const GET: RequestHandler = async ({ params }) => {
	const tournament = getTournament(params.id);
	
	if (!tournament) {
		return json({ error: 'Tournament not found' }, { status: 404 });
	}
	
	const teams = getTournamentTeams(params.id);
	
	return json({ tournament, teams });
};
