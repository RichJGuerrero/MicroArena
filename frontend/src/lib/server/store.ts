// frontend/src/lib/server/store.ts
// TEMP in-memory stores for V0. These reset when the dev server restarts.

export type User = {
	username: string;      // display
	usernameKey: string;   // normalized
	password: string;      // hash
	integrity: number;
	clan: string | null;   // tagKey
	createdAt: number;
};

export type Clan = {
	tag: string;           // display
	tagKey: string;        // normalized
	name: string;
	members: string[];     // usernameKeys
	integrity: number;
	createdAt: number;
};

export const users = new Map<string, User>(); // key: usernameKey
export const clans = new Map<string, Clan>(); // key: tagKey
