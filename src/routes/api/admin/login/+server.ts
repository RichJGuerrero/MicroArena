import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminKey, setAdminSession } from '$lib/server/admin';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const key = (body?.key ?? '').toString().trim();
		if (!key) return json({ error: 'Key required' }, { status: 400 });

		if (key !== getAdminKey()) {
			return json({ error: 'Invalid key' }, { status: 403 });
		}

		setAdminSession(cookies);
		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Login failed' },
			{ status: 500 }
		);
	}
};
