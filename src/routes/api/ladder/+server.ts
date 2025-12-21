import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLadder } from '$lib/server/store';

export const GET: RequestHandler = async () => {
	const ladder = getLadder();
	return json({ ladder });
};
