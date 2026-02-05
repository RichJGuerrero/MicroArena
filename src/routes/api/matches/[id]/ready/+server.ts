import { json } from '@sveltejs/kit';
import { readyUpArenaMatch } from '$lib/server/store';

export async function POST({ params, request }) {
	try {
		const { userId } = await request.json();
		if (!userId) return json({ error: 'userId is required' }, { status: 400 });
		const match = readyUpArenaMatch(params.id, userId);
		return json({ match });
	} catch (e: any) {
		return json({ error: e?.message ?? 'Failed to ready up' }, { status: 400 });
	}
}
