import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createIntegrityEvent, getIntegrityEvents, getUser } from '$lib/server/store';

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');
	
	if (!userId) {
		return json({ error: 'User ID required' }, { status: 400 });
	}
	
	const events = getIntegrityEvents(userId);
	return json({ events });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { type, targetUserId, severity, description, reportedBy, matchId } = body;
		
		if (!type || !targetUserId || !severity || !description) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		const event = createIntegrityEvent({
			type,
			targetUserId,
			severity: Math.min(5, Math.max(1, severity)),
			description,
			reportedBy,
			matchId
		});
		
		const user = getUser(targetUserId);
		
		return json({ event, user }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Report failed' },
			{ status: 400 }
		);
	}
};
