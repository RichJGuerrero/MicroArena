import { json } from '@sveltejs/kit';
import { users, clans } from '$lib/server/store';

export async function POST({ request }) {
	const { tag, name, ownerUsernameKey } = await request.json();

	if (!tag || !name || !ownerUsernameKey) {
		return json({ error: 'Missing fields' }, { status: 400 });
	}

	const rawTag = String(tag).trim();
	const tagKey = rawTag.toLowerCase();
	const clanName = String(name).trim();

	if (rawTag.length < 2 || rawTag.length > 5) {
		return json({ error: 'Clan tag must be 2–5 characters' }, { status: 400 });
	}

	// Ensure user exists
	const user = users.get(ownerUsernameKey);
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Prevent creating while already in a clan
	if (user.clan) {
		return json({ error: 'User already in a clan' }, { status: 409 });
	}

	// Unique clan tag
	if (clans.has(tagKey)) {
		return json({ error: 'Clan tag already taken' }, { status: 409 });
	}

	// Create clan in the shared store
	clans.set(tagKey, {
		tag: rawTag,        // display casing
		tagKey,             // normalized
		name: clanName,
		members: [ownerUsernameKey],
		integrity: 100,
		createdAt: Date.now()
	});

	// Auto-join creator
	user.clan = tagKey;

	return json({ success: true });
}
