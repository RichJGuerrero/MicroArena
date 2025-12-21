import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllClans, createClan } from '$lib/server/store';
import { normalizeTag } from '$lib/types';

export const GET: RequestHandler = async () => {
	const clans = getAllClans();
	return json({ clans });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { tag, name, description, founderId } = body;
		
		if (!tag || !name || !founderId) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		// Validate tag
		const normalizedTag = normalizeTag(tag);
		if (normalizedTag.length < 2 || normalizedTag.length > 6) {
			return json({ error: 'Tag must be 2-6 characters' }, { status: 400 });
		}
		
		// Validate name
		if (name.length < 3 || name.length > 32) {
			return json({ error: 'Name must be 3-32 characters' }, { status: 400 });
		}
		
		const clan = createClan({ tag: normalizedTag, name, description, founderId });
		return json({ clan }, { status: 201 });
		
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to create clan' },
			{ status: 400 }
		);
	}
};
