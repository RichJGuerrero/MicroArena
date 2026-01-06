import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Invite-only clans: direct join is disabled in V0.
export const POST: RequestHandler = async () => {
	return json(
		{ error: 'Clans are invite-only. Check your Inbox for invitations.' },
		{ status: 403 }
	);
};
