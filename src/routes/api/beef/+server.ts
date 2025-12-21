import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllBeefMatches, createBeefMatch, getUser } from '$lib/server/store';

export const GET: RequestHandler = async ({ url }) => {
	let matches = getAllBeefMatches();
	
	const status = url.searchParams.get('status');
	const clanId = url.searchParams.get('clanId');
	
	if (status) {
		matches = matches.filter(m => m.status === status);
	}
	
	if (clanId) {
		matches = matches.filter(m => 
			m.challengerClanId === clanId || m.challengedClanId === clanId
		);
	}
	
	return json({ beefMatches: matches });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { 
			format, 
			challengerClanId, 
			challengedClanId, 
			ruleset,
			scheduledTime,
			refRequired,
			streamRequired,
			createdBy 
		} = body;
		
		if (!format || !challengerClanId || !challengedClanId || !ruleset || !createdBy) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		// Verify creator is in challenger clan
		const user = getUser(createdBy);
		if (!user || user.clanId !== challengerClanId) {
			return json({ error: 'You can only challenge from your own clan' }, { status: 403 });
		}
		
		const beef = createBeefMatch({
			format,
			challengerClanId,
			challengedClanId,
			ruleset,
			scheduledTime,
			refRequired,
			streamRequired,
			createdBy
		});
		
		return json({ beefMatch: beef }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to create beef match' },
			{ status: 400 }
		);
	}
};
