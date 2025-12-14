import { json } from '@sveltejs/kit';

const clans = new Map<string, any>(); // TEMP in-memory store

export async function POST({ request }) {
	const { tag, name, ownerUsernameKey } = await request.json();

	if (!tag || !name || !ownerUsernameKey) {
		return json({ error: 'Missing fields' }, { status: 400 });
	}

	const rawTag = tag.trim();
	const tagKey = rawTag.toLowerCase();

	if (rawTag.length < 2 || rawTag.length > 5) {
		return json({ error: 'Clan tag must be 2–5 characters' }, { status: 400 });
	}

	if (clans.has(tagKey)) {
		return json({ error: 'Clan tag already taken' }, { status: 409 });
	}

	clans.set(tagKey, {
		tag: rawTag,          // display casing
		tagKey,               // normalized
		name,
		members: [ownerUsernameKey],
		integrity: 100,
		createdAt: Date.now()
	});

	return json({ success: true });
}
