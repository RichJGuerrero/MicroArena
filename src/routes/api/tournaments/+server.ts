import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllTournaments, getTournamentTeams } from '$lib/server/store';

export const GET: RequestHandler = async ({ url }) => {
	let tournaments = getAllTournaments();
	
	const status = url.searchParams.get('status');
	const tier = url.searchParams.get('tier');
	
	if (status) {
		tournaments = tournaments.filter(t => t.status === status);
	}
	
	if (tier) {
		tournaments = tournaments.filter(t => t.tier === tier);
	}
	
	// Add team count to each tournament
	const tournamentsWithTeams = tournaments.map(t => ({
		...t,
		registeredCount: getTournamentTeams(t.id).length
	}));
	
	return json({ tournaments: tournamentsWithTeams });
};
