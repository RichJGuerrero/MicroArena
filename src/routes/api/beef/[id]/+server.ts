import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBeefMatch, updateBeefMatch } from '$lib/server/store';

export const GET: RequestHandler = async ({ params }) => {
	const beef = getBeefMatch(params.id);
	
	if (!beef) {
		return json({ error: 'Beef match not found' }, { status: 404 });
	}
	
	return json({ beefMatch: beef });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const beef = updateBeefMatch(params.id, body);
		
		if (!beef) {
			return json({ error: 'Beef match not found' }, { status: 404 });
		}
		
		return json({ beefMatch: beef });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Update failed' },
			{ status: 400 }
		);
	}
};
