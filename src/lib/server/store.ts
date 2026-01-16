// Server-side data store for MicroArena
// V0: In-memory storage (replace with database in production)

import type {
	User,
	Clan,
	ClanWithMembers,
	ClanMember,
	IntegrityEvent,
	BeefMatch,
	Tournament,
	TournamentTeam,
	Match,
<<<<<<< HEAD
	ArenaMatch,
	ArenaMatchView,
	ArenaSideKey,
=======
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3
	MatchQueue,
	LadderEntry,
	UserStats,
	ClanStats,
	MatchParticipant
} from '$lib/types';

// ============================================
// DATA STORES
// ============================================
const users = new Map<string, User>();
const clans = new Map<string, Clan>();
const clanMembers = new Map<string, Set<string>>(); // clanId -> Set of userIds
const integrityEvents = new Map<string, IntegrityEvent>();
const beefMatches = new Map<string, BeefMatch>();
const tournaments = new Map<string, Tournament>();
const tournamentTeams = new Map<string, Map<string, TournamentTeam>>(); // tournamentId -> (clanId -> team)
const matches = new Map<string, Match>();
const ladderRatings = new Map<string, number>(); // clanId -> rating

// Match Board / Direct Challenges (CMG/GB style)
const arenaMatches = new Map<string, ArenaMatch>();

// ============================================
// ID GENERATION
// ============================================
export function generateId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================
// MATCH BOARD HELPERS
// ============================================
function getTeamSize(format: BeefMatch['format']): number {
	switch (format) {
		case '1v1': return 1;
		case '2v2': return 2;
		case '3v3': return 3;
		case '4v4': return 4;
		case '5v5': return 5;
		default: return 1;
	}
}

function toParticipants(ids: string[]): MatchParticipant[] {
	return ids
		.map((id) => users.get(id))
		.filter((u): u is User => !!u)
		.map((u) => ({ id: u.id, username: u.username }));
}

function arenaToMatch(arena: ArenaMatch): Match {
	// Only CLAN-scoped arena matches are represented in match history right now.
	const team1 = arena.teamA.clanId ? clans.get(arena.teamA.clanId) : null;
	const team2 = arena.teamB.clanId ? clans.get(arena.teamB.clanId) : null;
	if (!team1 || !team2) {
		throw new Error('Arena match is missing clans');
	}

	const winnerId = arena.winnerSide === 'A' ? team1.id : arena.winnerSide === 'B' ? team2.id : null;

	return {
		id: arena.id,
		scope: arena.scope,
		format: arena.format,
		queue: arena.queue,
		type: 'LADDER',
		referenceId: arena.id,
		team1Id: team1.id,
		team2Id: team2.id,
		team1,
		team2,
		team1PlayerIds: arena.teamA.playerIds,
		team2PlayerIds: arena.teamB.playerIds,
		team1Players: toParticipants(arena.teamA.playerIds),
		team2Players: toParticipants(arena.teamB.playerIds),
		team1Score: arena.scoreA,
		team2Score: arena.scoreB,
		winnerId,
		status: arena.status === 'COMPLETED' ? 'COMPLETED' : arena.status === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED',
		scheduledTime: arena.scheduledTime,
		completedAt: arena.completedAt,
		createdAt: arena.createdAt
	};
}

// ============================================
// USER OPERATIONS
// ============================================
export function createUser(data: {
	id: string;
	email: string;
	username: string;
	avatar?: string | null;
}): User {
	const usernameKey = data.username.toLowerCase().trim();
	
	// Check if username is taken
	for (const user of users.values()) {
		if (user.usernameKey === usernameKey && user.id !== data.id) {
			throw new Error('Username already taken');
		}
	}
	
	const user: User = {
		id: data.id,
		username: data.username,
		usernameKey,
		email: data.email,
		avatar: data.avatar || null,
		clanId: null,
		integrity: 100,
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
	
	users.set(data.id, user);
	return user;
}

export function getUser(userId: string): User | null {
	return users.get(userId) || null;
}

export function getUserByUsername(username: string): User | null {
	const key = username.toLowerCase().trim();
	for (const user of users.values()) {
		if (user.usernameKey === key) return user;
	}
	return null;
}

export function getUserByEmail(email: string): User | null {
	for (const user of users.values()) {
		if (user.email.toLowerCase() === email.toLowerCase()) return user;
	}
	return null;
}

export function updateUser(userId: string, data: Partial<User>): User | null {
	const user = users.get(userId);
	if (!user) return null;
	
	if (data.username) {
		const newKey = data.username.toLowerCase().trim();
		for (const u of users.values()) {
			if (u.usernameKey === newKey && u.id !== userId) {
				throw new Error('Username already taken');
			}
		}
		data.usernameKey = newKey;
	}
	
	const updated = { ...user, ...data, updatedAt: Date.now() };
	users.set(userId, updated);
	return updated;
}

export function getAllUsers(): User[] {
	return Array.from(users.values());
}

export function getUserStats(userId: string): UserStats {
	const empty = (): { matchesPlayed: number; xp: number; wins: number; losses: number; winRate: number } => ({
		matchesPlayed: 0,
		xp: 0,
		wins: 0,
		losses: 0,
		winRate: 0
	});

	const user = users.get(userId);
	if (!user) {
		return {
			overall: empty(),
			solo: empty(),
			clan: empty(),
			beefWins: 0,
			beefLosses: 0,
			tournamentWins: 0
		};
	}

<<<<<<< HEAD
	// Solo stats are derived from completed PLAYER-scoped 1v1 matches.
	let soloWins = 0;
	let soloLosses = 0;
	for (const m of getAllArenaMatches()) {
		if (m.scope !== 'PLAYER') continue;
		if (m.format !== '1v1') continue;
		if (m.status !== 'COMPLETED') continue;
		if (m.queue !== 'RANKED') continue;
		const inA = m.teamA.playerIds.includes(userId);
		const inB = m.teamB.playerIds.includes(userId);
		if (!inA && !inB) continue;
		const won = (inA && m.winnerSide === 'A') || (inB && m.winnerSide === 'B');
		if (won) soloWins++; else soloLosses++;
	}
	const soloMatchesPlayed = soloWins + soloLosses;
	const soloXp = (soloMatchesPlayed * 100) + (soloWins * 50);
	const solo = {
		matchesPlayed: soloMatchesPlayed,
		xp: soloXp,
		wins: soloWins,
		losses: soloLosses,
		winRate: soloMatchesPlayed > 0 ? Math.round((soloWins / soloMatchesPlayed) * 100) : 0
	};
=======
	// V0: "Solo" matches are not implemented yet (future queue / direct challenge).
	// We still return a dedicated bucket so UI + future features don't mix solo into clan stats.
	const solo = empty();
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3

	// Clan/team stats are derived from completed Beef Matches in the user's current clan.
	// IMPORTANT: 1v1 is treated as SOLO-only and does not affect clan stats.
	let clanWins = 0;
	let clanLosses = 0;
	let beefWins = 0;
	let beefLosses = 0;
	let tournamentWins = 0;

	if (user.clanId) {
		const clanBeefs = getBeefMatchesForClan(user.clanId)
			.filter((b) => b.status === 'COMPLETED')
<<<<<<< HEAD
			.filter((b) => (b.queue ?? 'RANKED') === 'RANKED')
=======
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3
			.filter((b) => b.format !== '1v1');

		for (const beef of clanBeefs) {
			const p1 = beef.challengerPlayerIds ?? [];
			const p2 = beef.challengedPlayerIds ?? [];
			const hasRoster = p1.length > 0 || p2.length > 0;
			const played = !hasRoster || p1.includes(userId) || p2.includes(userId);
			if (!played) continue;

			const won = beef.winnerId === user.clanId;
			if (won) {
				clanWins++;
				beefWins++;
			} else {
				clanLosses++;
				beefLosses++;
			}
<<<<<<< HEAD
		}

		const clanArenas = getAllArenaMatches()
			.filter((m) => m.scope === 'CLAN')
			.filter((m) => m.status === 'COMPLETED')
			.filter((m) => m.queue === 'RANKED')
			.filter((m) => m.teamA.clanId === user.clanId || m.teamB.clanId === user.clanId);

		for (const m of clanArenas) {
			// If rosters are tracked, only count if the user participated.
			const rosterKnown = m.teamA.playerIds.length > 0 || m.teamB.playerIds.length > 0;
			const played = !rosterKnown || m.teamA.playerIds.includes(userId) || m.teamB.playerIds.includes(userId);
			if (!played) continue;

			const winnerClanId = m.winnerSide === 'A' ? m.teamA.clanId : m.winnerSide === 'B' ? m.teamB.clanId : null;
			const won = winnerClanId === user.clanId;
			if (won) clanWins++; else clanLosses++;
=======
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3
		}
	}

	const clanMatchesPlayed = clanWins + clanLosses;
	const clanXp = (clanMatchesPlayed * 100) + (clanWins * 50);
	const clan = {
		matchesPlayed: clanMatchesPlayed,
		xp: clanXp,
		wins: clanWins,
		losses: clanLosses,
		winRate: clanMatchesPlayed > 0 ? Math.round((clanWins / clanMatchesPlayed) * 100) : 0
	};

	const overallMatchesPlayed = solo.matchesPlayed + clan.matchesPlayed;
	const overallWins = solo.wins + clan.wins;
	const overallLosses = solo.losses + clan.losses;
	const overallXp = solo.xp + clan.xp;
	const overall = {
		matchesPlayed: overallMatchesPlayed,
		xp: overallXp,
		wins: overallWins,
		losses: overallLosses,
		winRate: overallMatchesPlayed > 0 ? Math.round((overallWins / overallMatchesPlayed) * 100) : 0
	};

	return {
		overall,
		solo,
		clan,
		beefWins,
		beefLosses,
		tournamentWins
	};
}

// ============================================
// CLAN OPERATIONS
// ============================================
export function createClan(data: {
	tag: string;
	name: string;
	description?: string;
	founderId: string;
}): Clan {
	const tagKey = data.tag.toUpperCase().trim();
	
	// Check if tag is taken
	for (const clan of clans.values()) {
		if (clan.tagKey === tagKey) {
			throw new Error('Clan tag already taken');
		}
	}
	
	// Check if founder exists and isn't in a clan
	const founder = users.get(data.founderId);
	if (!founder) throw new Error('Founder not found');
	if (founder.clanId) throw new Error('You are already in a clan');
	
	const clan: Clan = {
		id: generateId(),
		tag: data.tag.toUpperCase(),
		tagKey,
		name: data.name,
		description: data.description || '',
		founderId: data.founderId,
		integrity: founder.integrity,
		memberCount: 1,
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
	
	clans.set(clan.id, clan);
	clanMembers.set(clan.id, new Set([data.founderId]));
	
	// Update founder's clanId
	updateUser(data.founderId, { clanId: clan.id });
	
	// Initialize ladder rating
	ladderRatings.set(clan.id, 1500);
	
	return clan;
}

export function getClan(clanId: string): Clan | null {
	return clans.get(clanId) || null;
}

export function getClanByTag(tag: string): Clan | null {
	const tagKey = tag.toUpperCase().trim();
	for (const clan of clans.values()) {
		if (clan.tagKey === tagKey) return clan;
	}
	return null;
}

export function getClanWithMembers(clanId: string): ClanWithMembers | null {
	const clan = clans.get(clanId);
	if (!clan) return null;
	
	const memberIds = clanMembers.get(clanId) || new Set();
	const members: ClanMember[] = [];
	let founder: ClanMember | null = null;
	
	for (const userId of memberIds) {
		const user = users.get(userId);
		if (!user) continue;
		
		const member: ClanMember = {
			id: user.id,
			username: user.username,
			avatar: user.avatar,
			integrity: user.integrity,
			isFounder: user.id === clan.founderId,
			joinedAt: user.updatedAt // Approximation
		};
		
		members.push(member);
		if (member.isFounder) founder = member;
	}
	
	if (!founder) {
		// This shouldn't happen, but handle it gracefully
		founder = members[0] || {
			id: clan.founderId,
			username: 'Unknown',
			avatar: null,
			integrity: 100,
			isFounder: true,
			joinedAt: clan.createdAt
		};
	}
	
	return { ...clan, members, founder };
}

export function getAllClans(): Clan[] {
	return Array.from(clans.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function joinClan(clanId: string, userId: string): Clan {
	const clan = clans.get(clanId);
	if (!clan) throw new Error('Clan not found');
	
	const user = users.get(userId);
	if (!user) throw new Error('User not found');
	if (user.clanId) throw new Error('You are already in a clan');
	
	const members = clanMembers.get(clanId) || new Set();
	members.add(userId);
	clanMembers.set(clanId, members);
	
	// Update user
	updateUser(userId, { clanId });
	
	// Recalculate clan integrity and member count
	recalculateClanIntegrity(clanId);
	
	return clans.get(clanId)!;
}

export function leaveClan(clanId: string, userId: string): { disbanded: boolean } {
	const clan = clans.get(clanId);
	if (!clan) throw new Error('Clan not found');
	
	const user = users.get(userId);
	if (!user) throw new Error('User not found');
	if (user.clanId !== clanId) throw new Error('You are not in this clan');
	
	const members = clanMembers.get(clanId) || new Set();
	members.delete(userId);
	
	// Update user
	updateUser(userId, { clanId: null });
	
	// If founder leaving and members remain, transfer ownership
	if (clan.founderId === userId && members.size > 0) {
		const newFounder = Array.from(members)[0];
		clan.founderId = newFounder;
		clan.updatedAt = Date.now();
		clans.set(clanId, clan);
	}
	
	// If no members left, disband clan
	if (members.size === 0) {
		clans.delete(clanId);
		clanMembers.delete(clanId);
		ladderRatings.delete(clanId);
		return { disbanded: true };
	}
	
	clanMembers.set(clanId, members);
	recalculateClanIntegrity(clanId);
	
	return { disbanded: false };
}

export function updateClan(clanId: string, data: Partial<Clan>): Clan | null {
	const clan = clans.get(clanId);
	if (!clan) return null;
	
	const updated = { ...clan, ...data, updatedAt: Date.now() };
	clans.set(clanId, updated);
	return updated;
}

function recalculateClanIntegrity(clanId: string): void {
	const clan = clans.get(clanId);
	if (!clan) return;
	
	const members = clanMembers.get(clanId);
	if (!members || members.size === 0) return;
	
	let totalIntegrity = 0;
	for (const userId of members) {
		const user = users.get(userId);
		if (user) totalIntegrity += user.integrity;
	}
	
	clan.integrity = Math.round(totalIntegrity / members.size);
	clan.memberCount = members.size;
	clan.updatedAt = Date.now();
	clans.set(clanId, clan);
}

// ============================================
// INTEGRITY OPERATIONS
// ============================================
export function createIntegrityEvent(data: {
	type: IntegrityEvent['type'];
	targetUserId: string;
	severity: number;
	description: string;
	reportedBy?: string;
	matchId?: string;
}): IntegrityEvent {
	const user = users.get(data.targetUserId);
	if (!user) throw new Error('User not found');
	
	const event: IntegrityEvent = {
		id: generateId(),
		type: data.type,
		targetUserId: data.targetUserId,
		targetClanId: user.clanId,
		severity: Math.min(5, Math.max(1, data.severity)),
		description: data.description,
		reportedBy: data.reportedBy || 'SYSTEM',
		matchId: data.matchId || null,
		resolved: false,
		createdAt: Date.now()
	};
	
	integrityEvents.set(event.id, event);
	
	// Apply integrity change
	if (data.type === 'RESTORED') {
		const newIntegrity = Math.min(100, user.integrity + event.severity * 5);
		updateUser(data.targetUserId, { integrity: newIntegrity });
	} else {
		const newIntegrity = Math.max(0, user.integrity - event.severity * 5);
		updateUser(data.targetUserId, { integrity: newIntegrity });
	}
	
	// Recalculate clan integrity if applicable
	if (user.clanId) {
		recalculateClanIntegrity(user.clanId);
	}
	
	return event;
}

export function getIntegrityEvents(userId: string): IntegrityEvent[] {
	return Array.from(integrityEvents.values())
		.filter(e => e.targetUserId === userId)
		.sort((a, b) => b.createdAt - a.createdAt);
}

// ============================================
// BEEF MATCH OPERATIONS
// ============================================
export function createBeefMatch(data: {
	format: BeefMatch['format'];
	challengerClanId: string;
	challengedClanId: string;
	ruleset: string;
	scheduledTime?: number;
	refRequired?: boolean;
	streamRequired?: boolean;
	// Ranked or Unranked queue (defaults to RANKED)
	queue?: MatchQueue;
	createdBy: string;
}): BeefMatch {
	const challenger = clans.get(data.challengerClanId);
	const challenged = clans.get(data.challengedClanId);
	
	if (!challenger) throw new Error('Challenger clan not found');
	if (!challenged) throw new Error('Challenged clan not found');
	if (data.challengerClanId === data.challengedClanId) {
		throw new Error('Cannot challenge your own clan');
	}
	
	const beef: BeefMatch = {
		id: generateId(),
		format: data.format,
		queue: data.queue ?? 'RANKED',
		challengerClanId: data.challengerClanId,
		challengedClanId: data.challengedClanId,
		ruleset: data.ruleset,
		scheduledTime: data.scheduledTime || null,
		status: 'PENDING',
		refRequired: data.refRequired ?? true,
		streamRequired: data.streamRequired ?? false,
		streamUrl: null,
		winnerId: null,
		challengerScore: null,
		challengedScore: null,
		createdBy: data.createdBy,
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
	
	beefMatches.set(beef.id, beef);
	return beef;
}

export function getBeefMatch(id: string): BeefMatch | null {
	const beef = beefMatches.get(id);
	if (!beef) return null;
	
	return {
		...beef,
		challengerClan: clans.get(beef.challengerClanId),
		challengedClan: clans.get(beef.challengedClanId)
	};
}

export function getAllBeefMatches(): BeefMatch[] {
	return Array.from(beefMatches.values())
		.map(beef => ({
			...beef,
			challengerClan: clans.get(beef.challengerClanId),
			challengedClan: clans.get(beef.challengedClanId)
		}))
		.sort((a, b) => b.createdAt - a.createdAt);
}

export function getBeefMatchesForClan(clanId: string): BeefMatch[] {
	return getAllBeefMatches().filter(
		b => b.challengerClanId === clanId || b.challengedClanId === clanId
	);
}

export function updateBeefMatch(id: string, data: Partial<BeefMatch>): BeefMatch | null {
	const beef = beefMatches.get(id);
	if (!beef) return null;
	
	const updated = { ...beef, ...data, updatedAt: Date.now() };
	beefMatches.set(id, updated);
	return updated;
}

export function respondToBeefMatch(id: string, accept: boolean, responderId: string): BeefMatch {
	const beef = beefMatches.get(id);
	if (!beef) throw new Error('Beef match not found');
	if (beef.status !== 'PENDING') throw new Error('Cannot respond to this match');
	
	// Verify responder is in challenged clan
	const user = users.get(responderId);
	if (!user || user.clanId !== beef.challengedClanId) {
		throw new Error('Only challenged clan members can respond');
	}
	
	beef.status = accept ? 'ACCEPTED' : 'DECLINED';
	beef.updatedAt = Date.now();
	beefMatches.set(id, beef);
	
	return beef;
}

export function completeBeefMatch(
	id: string,
	winnerId: string,
	challengerScore: number,
	challengedScore: number,
	challengerPlayerIds?: string[],
	challengedPlayerIds?: string[]
): BeefMatch {
	const beef = beefMatches.get(id);
	if (!beef) throw new Error('Beef match not found');
	
	beef.status = 'COMPLETED';
	beef.winnerId = winnerId;
	beef.challengerScore = challengerScore;
	beef.challengedScore = challengedScore;
	if (challengerPlayerIds) beef.challengerPlayerIds = challengerPlayerIds;
	if (challengedPlayerIds) beef.challengedPlayerIds = challengedPlayerIds;
	beef.updatedAt = Date.now();
	beefMatches.set(id, beef);
	
	// Update ladder ratings
	const winnerRating = ladderRatings.get(winnerId) || 1500;
	const loserId = winnerId === beef.challengerClanId ? beef.challengedClanId : beef.challengerClanId;
	const loserRating = ladderRatings.get(loserId) || 1500;
	
	// Simple ELO calculation
	const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
	const kFactor = 32;
	const ratingChange = Math.round(kFactor * (1 - expectedWinner));
	
	ladderRatings.set(winnerId, winnerRating + ratingChange);
	ladderRatings.set(loserId, Math.max(1000, loserRating - ratingChange));
	
	return beef;
}

// ============================================
// ARENA MATCH OPERATIONS (Match Board / Direct Challenges)
// ============================================
export function createArenaMatch(data: {
	visibility: ArenaMatch['visibility'];
	scope: ArenaMatch['scope'];
	format: ArenaMatch['format'];
	queue: ArenaMatch['queue'];
	ruleset: string;
	refRequired?: boolean;
	streamRequired?: boolean;
	scheduledTime?: number;
	createdBy: string;
	/** For DIRECT challenges: username (PLAYER) or clan tag (CLAN). */
	target?: string;
}): ArenaMatch {
	const creator = users.get(data.createdBy);
	if (!creator) throw new Error('Creator not found');

	// Canon: Ranked affects XP/ladders; Unranked affects nothing.
	// Canon: Clan ladder is always Ranked and 4v4 only.
	if (data.scope === 'CLAN' && data.queue === 'RANKED' && data.format !== '4v4') {
		throw new Error('Clan ranked matches must be 4v4');
	}

	const now = Date.now();
	const match: ArenaMatch = {
		id: generateId(),
		visibility: data.visibility,
		status: data.visibility === 'DIRECT' ? 'PENDING' : 'OPEN',
		scope: data.scope,
		format: data.format,
		queue: data.queue,
		ruleset: data.ruleset,
		refRequired: data.refRequired ?? true,
		streamRequired: data.streamRequired ?? false,
		streamUrl: null,
		scheduledTime: data.scheduledTime ?? null,
		createdBy: data.createdBy,
		createdAt: now,
		updatedAt: now,
		completedAt: null,
		teamA: { clanId: null, playerIds: [] },
		teamB: { clanId: null, playerIds: [] },
		challengedUserId: null,
		challengedClanId: null,
		winnerSide: null,
		scoreA: null,
		scoreB: null
	};

	// Seed Team A
	if (data.scope === 'CLAN') {
		if (!creator.clanId) throw new Error('You must be in a clan to create a clan match');
		match.teamA.clanId = creator.clanId;
		match.teamA.playerIds = [creator.id];
	} else {
		match.teamA.playerIds = [creator.id];
	}

	// DIRECT challenges target a specific opponent.
	if (data.visibility === 'DIRECT') {
		const target = (data.target ?? '').trim();
		if (!target) throw new Error('Target is required for direct challenges');

		if (data.scope === 'PLAYER') {
			const challenged = getUserByUsername(target);
			if (!challenged) throw new Error('Target user not found');
			if (challenged.id === creator.id) throw new Error('Cannot challenge yourself');
			match.challengedUserId = challenged.id;
			// Team B fills when the opponent accepts.
		} else {
			const challengedClan = getClanByTag(target);
			if (!challengedClan) throw new Error('Target clan not found');
			if (challengedClan.id === creator.clanId) throw new Error('Cannot challenge your own clan');
			match.challengedClanId = challengedClan.id;
			match.teamB.clanId = challengedClan.id;
			// Team B roster fills when a member accepts.
		}
	}

	arenaMatches.set(match.id, match);
	return match;
}

export function getArenaMatch(id: string): ArenaMatch | null {
	return arenaMatches.get(id) ?? null;
}

export function getAllArenaMatches(): ArenaMatch[] {
	return Array.from(arenaMatches.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getArenaMatchViews(): ArenaMatchView[] {
	const all = getAllArenaMatches();
	return all.map((m) => {
		const createdByUser = users.get(m.createdBy) ? { id: m.createdBy, username: users.get(m.createdBy)!.username } : null;
		const teamAClan = m.teamA.clanId ? clans.get(m.teamA.clanId) ?? null : null;
		const teamBClan = m.teamB.clanId ? clans.get(m.teamB.clanId) ?? null : null;
		return {
			match: m,
			createdByUser,
			teamAClan,
			teamBClan,
			teamAPlayers: toParticipants(m.teamA.playerIds),
			teamBPlayers: toParticipants(m.teamB.playerIds)
		};
	});
}

export function respondToArenaChallenge(id: string, responderId: string, accept: boolean): ArenaMatch {
	const match = arenaMatches.get(id);
	if (!match) throw new Error('Match not found');
	if (match.visibility !== 'DIRECT') throw new Error('Not a direct challenge');
	if (match.status !== 'PENDING') throw new Error('This challenge is not pending');

	const responder = users.get(responderId);
	if (!responder) throw new Error('Responder not found');

	if (match.scope === 'PLAYER') {
		if (match.challengedUserId !== responderId) throw new Error('Only the challenged player can respond');
		if (!accept) {
			match.status = 'DECLINED';
			match.updatedAt = Date.now();
			arenaMatches.set(id, match);
			return match;
		}

		// Accept: lock opponent into Team B
		match.teamB.playerIds = [responderId];
		match.status = 'OPEN';
	} else {
		// CLAN: responder must be in challenged clan
		if (!responder.clanId || responder.clanId !== match.challengedClanId) {
			throw new Error('Only members of the challenged clan can respond');
		}
		if (!accept) {
			match.status = 'DECLINED';
			match.updatedAt = Date.now();
			arenaMatches.set(id, match);
			return match;
		}
		// Accept: roster seed and open join
		match.teamB.clanId = responder.clanId;
		if (!match.teamB.playerIds.includes(responderId)) {
			match.teamB.playerIds.push(responderId);
		}
		match.status = 'OPEN';
	}

	// If both sides are already full, mark LIVE.
	const size = getTeamSize(match.format);
	if (match.teamA.playerIds.length >= size && match.teamB.playerIds.length >= size) {
		match.status = 'LIVE';
	}

	match.updatedAt = Date.now();
	arenaMatches.set(id, match);
	return match;
}

export function joinArenaMatch(id: string, userId: string, side: ArenaSideKey): ArenaMatch {
	const match = arenaMatches.get(id);
	if (!match) throw new Error('Match not found');
	if (!(match.status === 'OPEN' || match.status === 'LIVE')) {
		throw new Error('This match is not joinable');
	}

	const user = users.get(userId);
	if (!user) throw new Error('User not found');

	const size = getTeamSize(match.format);
	const a = match.teamA;
	const b = match.teamB;

	// Prevent joining both sides
	if (a.playerIds.includes(userId) || b.playerIds.includes(userId)) {
		return match;
	}

	if (match.scope === 'CLAN') {
		if (!user.clanId) throw new Error('You must be in a clan to join a clan match');

		if (side === 'A') {
			if (!a.clanId) throw new Error('Team A is not set');
			if (user.clanId !== a.clanId) throw new Error('You can only join your clan side');
			if (a.playerIds.length >= size) throw new Error('Team A is full');
			a.playerIds.push(userId);
		} else {
			// Team B can be claimed on OPEN matches (non-direct) if unset
			if (!b.clanId) {
				if (match.visibility === 'DIRECT') throw new Error('Opponent is locked for this challenge');
				b.clanId = user.clanId;
			}
			if (user.clanId !== b.clanId) throw new Error('You can only join your clan side');
			if (b.playerIds.length >= size) throw new Error('Team B is full');
			b.playerIds.push(userId);
		}
	} else {
		// PLAYER
		if (side === 'A') {
			if (a.playerIds.length >= size) throw new Error('Team A is full');
			a.playerIds.push(userId);
		} else {
			if (b.playerIds.length >= size) throw new Error('Team B is full');
			b.playerIds.push(userId);
		}
	}

	// If both sides are full (and for CLAN, both clans are set), mark LIVE.
	if (a.playerIds.length >= size && b.playerIds.length >= size) {
		if (match.scope === 'PLAYER' || (a.clanId && b.clanId)) {
			match.status = 'LIVE';
		}
	}

	match.updatedAt = Date.now();
	arenaMatches.set(id, match);
	return match;
}

export function completeArenaMatch(id: string, winnerSide: ArenaSideKey, scoreA?: number, scoreB?: number): ArenaMatch {
	const match = arenaMatches.get(id);
	if (!match) throw new Error('Match not found');
	if (match.status === 'COMPLETED') return match;
	if (!(match.status === 'LIVE' || match.status === 'OPEN')) {
		throw new Error('Match cannot be completed in its current state');
	}

	match.winnerSide = winnerSide;
	match.scoreA = typeof scoreA === 'number' ? scoreA : match.scoreA;
	match.scoreB = typeof scoreB === 'number' ? scoreB : match.scoreB;
	match.status = 'COMPLETED';
	match.completedAt = Date.now();
	match.updatedAt = Date.now();
	arenaMatches.set(id, match);
	return match;
}

// ============================================
// MATCH HISTORY (Derived)
// ============================================
function getClanSafe(clanId: string): Clan {
	const c = clans.get(clanId);
	if (c) return c;
	// Fallback: should be rare (e.g., clan deleted while match history remains)
	return {
		id: clanId,
		tag: '????',
		tagKey: '????',
		name: 'Unknown Clan',
		description: '',
		founderId: 'UNKNOWN',
		integrity: 0,
		memberCount: 0,
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
}

function idsToParticipants(ids?: string[]): MatchParticipant[] {
	if (!ids || ids.length === 0) return [];
	const out: MatchParticipant[] = [];
	for (const id of ids) {
		const u = users.get(id);
		if (u) out.push({ id: u.id, username: u.username });
	}
	return out;
}

function beefToMatch(beef: BeefMatch): Match {
	const team1 = beef.challengerClan ?? getClanSafe(beef.challengerClanId);
	const team2 = beef.challengedClan ?? getClanSafe(beef.challengedClanId);

	return {
		id: beef.id,
		scope: 'CLAN',
		format: beef.format,
		queue: (beef.queue ?? 'RANKED'),
		type: 'BEEF',
		referenceId: beef.id,
		team1Id: beef.challengerClanId,
		team2Id: beef.challengedClanId,
		team1,
		team2,
		team1PlayerIds: beef.challengerPlayerIds,
		team2PlayerIds: beef.challengedPlayerIds,
		team1Players: idsToParticipants(beef.challengerPlayerIds),
		team2Players: idsToParticipants(beef.challengedPlayerIds),
		team1Score: beef.challengerScore,
		team2Score: beef.challengedScore,
		winnerId: beef.winnerId,
		status: beef.status === 'COMPLETED' ? 'COMPLETED' : beef.status === 'DISPUTED' ? 'DISPUTED' : beef.status === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED',
		scheduledTime: beef.scheduledTime,
		completedAt: beef.status === 'COMPLETED' ? beef.updatedAt : null,
		createdAt: beef.createdAt
	};
}

export function getRecentMatchesForClan(clanId: string, limit = 5): Match[] {
<<<<<<< HEAD
	const items: { t: number; m: Match }[] = [];

	const beefs = getBeefMatchesForClan(clanId)
		.filter((b) => b.status === 'COMPLETED')
		.filter((b) => (b.queue ?? 'RANKED') === 'RANKED')
		// 1v1 is treated as solo play and should not appear in clan match history.
		.filter((b) => b.format !== '1v1');

	for (const b of beefs) {
		items.push({ t: b.updatedAt, m: beefToMatch(b) });
	}

	const arenas = getAllArenaMatches()
		.filter((m) => m.scope === 'CLAN')
		.filter((m) => m.status === 'COMPLETED')
		.filter((m) => m.queue === 'RANKED')
		.filter((m) => m.teamA.clanId === clanId || m.teamB.clanId === clanId);

	for (const a of arenas) {
		try {
			items.push({ t: a.updatedAt, m: arenaToMatch(a) });
		} catch {
			// ignore malformed arena matches
		}
	}

	items.sort((x, y) => y.t - x.t);
	return items.slice(0, Math.max(0, limit)).map((x) => x.m);
=======
	const completed = getBeefMatchesForClan(clanId)
		.filter(b => b.status === 'COMPLETED')
		// 1v1 is treated as solo play and should not appear in clan match history.
		.filter(b => b.format !== '1v1')
		.sort((a, b) => b.updatedAt - a.updatedAt)
		.slice(0, Math.max(0, limit));
	return completed.map(beefToMatch);
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3
}

export function getRecentMatchesForUser(userId: string, limit = 5): Match[] {
	const user = users.get(userId);
	if (!user || !user.clanId) return [];

	const clanMatches = getRecentMatchesForClan(user.clanId, Math.max(0, limit) * 2);
	const filtered = clanMatches.filter(m => {
		const rosterKnown = (m.team1PlayerIds?.length ?? 0) > 0 || (m.team2PlayerIds?.length ?? 0) > 0;
		if (!rosterKnown) return true;
		return (m.team1PlayerIds?.includes(userId) ?? false) || (m.team2PlayerIds?.includes(userId) ?? false);
	});
	return filtered.slice(0, Math.max(0, limit));
}

export function getClanStats(clanId: string): ClanStats {
<<<<<<< HEAD
	const beefCompleted = getBeefMatchesForClan(clanId)
		.filter((b) => b.status === 'COMPLETED')
		.filter((b) => (b.queue ?? 'RANKED') === 'RANKED')
		// 1v1 is a solo format and does not count toward clan stats.
		.filter((b) => b.format !== '1v1');

	const arenaCompleted = getAllArenaMatches()
		.filter((m) => m.scope === 'CLAN')
		.filter((m) => m.status === 'COMPLETED')
		.filter((m) => m.queue === 'RANKED')
		.filter((m) => m.teamA.clanId === clanId || m.teamB.clanId === clanId)
		.filter((m) => m.format !== '1v1');
=======
	const completed = getBeefMatchesForClan(clanId)
		.filter(b => b.status === 'COMPLETED')
		// 1v1 is a solo format and does not count toward clan stats.
		.filter(b => b.format !== '1v1')
		.sort((a, b) => b.updatedAt - a.updatedAt);
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3

	let wins = 0;
	let losses = 0;
	let lastMatchAt: number | null = null;

	for (const beef of beefCompleted) {
		if (!lastMatchAt || beef.updatedAt > lastMatchAt) lastMatchAt = beef.updatedAt;
		if (beef.winnerId === clanId) wins++;
		else losses++;
	}

	for (const m of arenaCompleted) {
		if (!lastMatchAt || m.updatedAt > lastMatchAt) lastMatchAt = m.updatedAt;
		const winnerClanId = m.winnerSide === 'A' ? m.teamA.clanId : m.winnerSide === 'B' ? m.teamB.clanId : null;
		if (winnerClanId === clanId) wins++;
		else losses++;
	}

	const matchesPlayed = wins + losses;
	const xp = (matchesPlayed * 100) + (wins * 50);
	const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

	return {
		clanId,
		xp,
		matchesPlayed,
		wins,
		losses,
		winRate,
		lastMatchAt
	};
}

// ============================================
// TOURNAMENT OPERATIONS
// ============================================
export function createTournament(data: {
	name: string;
	description: string;
	tier: Tournament['tier'];
	game: string;
	format: Tournament['format'];
	maxTeams: number;
	integrityRequirement: number;
	prizeDescription?: string;
	registrationDeadline: number;
	startTime: number;
}): Tournament {
	const tournament: Tournament = {
		id: generateId(),
		name: data.name,
		description: data.description,
		tier: data.tier,
		game: data.game,
		format: data.format,
		maxTeams: data.maxTeams,
		integrityRequirement: data.integrityRequirement,
		prizeDescription: data.prizeDescription || null,
		registrationDeadline: data.registrationDeadline,
		startTime: data.startTime,
		status: 'REGISTRATION_OPEN',
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
	
	tournaments.set(tournament.id, tournament);
	tournamentTeams.set(tournament.id, new Map());
	
	return tournament;
}

export function getTournament(id: string): Tournament | null {
	return tournaments.get(id) || null;
}

export function getAllTournaments(): Tournament[] {
	return Array.from(tournaments.values()).sort((a, b) => a.startTime - b.startTime);
}

export function getTournamentTeams(tournamentId: string): TournamentTeam[] {
	const teams = tournamentTeams.get(tournamentId);
	if (!teams) return [];
	
	return Array.from(teams.values()).map(team => ({
		...team,
		clan: clans.get(team.clanId)!
	})).filter(t => t.clan);
}

export function registerForTournament(tournamentId: string, clanId: string, registeredBy: string): TournamentTeam {
	const tournament = tournaments.get(tournamentId);
	if (!tournament) throw new Error('Tournament not found');
	if (tournament.status !== 'REGISTRATION_OPEN') {
		throw new Error('Registration is not open');
	}
	
	const clan = clans.get(clanId);
	if (!clan) throw new Error('Clan not found');
	
	if (clan.integrity < tournament.integrityRequirement) {
		throw new Error(`Clan integrity (${clan.integrity}) does not meet requirement (${tournament.integrityRequirement})`);
	}
	
	const teams = tournamentTeams.get(tournamentId) || new Map();
	if (teams.has(clanId)) {
		throw new Error('Clan already registered');
	}
	if (teams.size >= tournament.maxTeams) {
		throw new Error('Tournament is full');
	}
	
	const team: TournamentTeam = {
		clanId,
		clan,
		seed: null,
		registeredAt: Date.now(),
		registeredBy
	};
	
	teams.set(clanId, team);
	tournamentTeams.set(tournamentId, teams);
	
	return team;
}


// ============================================
// LADDER FILTERING (Tabs)
// ============================================
export type LadderTab = 'SINGLES' | 'DOUBLES' | 'TEAM' | 'CLANS';

function getClanXpLadderForFormats(formats: BeefMatch['format'][]): LadderEntry[] {
	// Only RANKED, COMPLETED matches contribute to ladders.
<<<<<<< HEAD
	const eligibleBeefs = getAllBeefMatches()
		.filter((b) => b.status === 'COMPLETED')
		.filter((b) => (b.queue ?? 'RANKED') === 'RANKED')
		.filter((b) => formats.includes(b.format));

	const eligibleArenas = getAllArenaMatches()
		.filter((m) => m.scope === 'CLAN')
		.filter((m) => m.status === 'COMPLETED')
		.filter((m) => m.queue === 'RANKED')
		.filter((m) => formats.includes(m.format));

	// If there are no eligible ranked matches at all, return empty so UI can show a true empty-state.
	if (eligibleBeefs.length + eligibleArenas.length === 0) return [];
=======
	const eligibleAll = getAllBeefMatches()
		.filter(b => b.status === 'COMPLETED')
		.filter(b => (b.queue ?? 'RANKED') === 'RANKED')
		.filter(b => formats.includes(b.format));

	// If there are no eligible ranked matches at all, return empty so UI can show a true empty-state.
	if (eligibleAll.length === 0) return [];
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3

	const entries: LadderEntry[] = [];

	for (const clan of clans.values()) {
<<<<<<< HEAD
		const clanBeefs = eligibleBeefs.filter((b) => b.challengerClanId === clan.id || b.challengedClanId === clan.id);
		const clanArenas = eligibleArenas.filter((m) => m.teamA.clanId === clan.id || m.teamB.clanId === clan.id);
		if (clanBeefs.length + clanArenas.length === 0) continue;
=======
		const clanBeefs = eligibleAll.filter(b => b.challengerClanId === clan.id || b.challengedClanId === clan.id);
		if (clanBeefs.length === 0) continue;
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3

		let wins = 0;
		let losses = 0;
		let lastMatchAt: number | null = null;

<<<<<<< HEAD
		const sortedBeefs = [...clanBeefs].sort((a, b) => b.updatedAt - a.updatedAt);
		for (const beef of sortedBeefs) {
=======
		const sorted = [...clanBeefs].sort((a, b) => b.updatedAt - a.updatedAt);
		for (const beef of sorted) {
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3
			if (beef.winnerId === clan.id) wins++;
			else losses++;
			if (!lastMatchAt) lastMatchAt = beef.updatedAt;
		}

<<<<<<< HEAD
		const sortedArenas = [...clanArenas].sort((a, b) => b.updatedAt - a.updatedAt);
		for (const m of sortedArenas) {
			const winnerClanId = m.winnerSide === 'A' ? m.teamA.clanId : m.winnerSide === 'B' ? m.teamB.clanId : null;
			if (winnerClanId === clan.id) wins++;
			else losses++;
			if (!lastMatchAt || m.updatedAt > lastMatchAt) lastMatchAt = m.updatedAt;
		}

=======
>>>>>>> fda08aa2bb71e02a1c0284073d549e1312947da3
		const matchesPlayed = wins + losses;
		const xp = (matchesPlayed * 100) + (wins * 50);

		entries.push({
			rank: 0,
			clanId: clan.id,
			clan,
			xp,
			matchesPlayed,
			wins,
			losses,
			lastMatchAt
		});
	}

	entries.sort((a, b) => {
		if (b.xp !== a.xp) return b.xp - a.xp;
		const bt = b.lastMatchAt ?? 0;
		const at = a.lastMatchAt ?? 0;
		if (bt !== at) return bt - at;
		return b.wins - a.wins;
	});
	entries.forEach((entry, i) => entry.rank = i + 1);

	return entries;
}

export function getLadderForTab(tab: LadderTab): LadderEntry[] {
	// Note: PLAYER-scoped ladders (Singles/Doubles/Team) will be powered by player/team match data.
	// The V0 scaffold currently only has clan-scoped Beef matches, so only the CLANS tab will have data.
	switch (tab) {
		case 'CLANS':
			// Clan ladder is 4v4-only, CLAN-scoped, Ranked.
			return getClanXpLadderForFormats(['4v4']);
		case 'SINGLES':
		case 'DOUBLES':
		case 'TEAM':
		default:
			return [];
	}
}

// ============================================
// LADDER OPERATIONS
// ============================================
export function getLadder(): LadderEntry[] {
	const entries: LadderEntry[] = [];
	
	for (const clan of clans.values()) {
		// XP Ladder (Launch V0)
		// XP is intentionally simple + transparent:
		//  - 100 XP per completed match
		//  - +50 XP per win
		//
		// Note: In the current V0 scaffold, completed match tracking exists for Beef Matches.
		// As additional match types are activated, they should also contribute to XP.
		const clanBeefs = getBeefMatchesForClan(clan.id)
			.filter((b) => b.status === 'COMPLETED')
			.filter((b) => (b.queue ?? 'RANKED') === 'RANKED');
		const clanArenas = getAllArenaMatches()
			.filter((m) => m.scope === 'CLAN')
			.filter((m) => m.status === 'COMPLETED')
			.filter((m) => m.queue === 'RANKED')
			.filter((m) => m.teamA.clanId === clan.id || m.teamB.clanId === clan.id);
		
		let wins = 0;
		let losses = 0;
		let lastMatchAt: number | null = null;
		
		// Sort by completion time so "last match" is correct
		const sortedBeefs = clanBeefs.sort((a, b) => b.updatedAt - a.updatedAt);
		
		for (const beef of sortedBeefs) {
			if (beef.winnerId === clan.id) wins++;
			else losses++;
			if (!lastMatchAt) lastMatchAt = beef.updatedAt;
		}

		const sortedArenas = clanArenas.sort((a, b) => b.updatedAt - a.updatedAt);
		for (const m of sortedArenas) {
			const winnerClanId = m.winnerSide === 'A' ? m.teamA.clanId : m.winnerSide === 'B' ? m.teamB.clanId : null;
			if (winnerClanId === clan.id) wins++;
			else losses++;
			if (!lastMatchAt || m.updatedAt > lastMatchAt) lastMatchAt = m.updatedAt;
		}
		
		const matchesPlayed = wins + losses;
		const xp = (matchesPlayed * 100) + (wins * 50);
		
		entries.push({
			rank: 0,
			clanId: clan.id,
			clan,
			xp,
			matchesPlayed,
			wins,
			losses,
			lastMatchAt
		});
	}
	
	// Sort by XP, then by last activity, then by wins
	entries.sort((a, b) => {
		if (b.xp !== a.xp) return b.xp - a.xp;
		const bt = b.lastMatchAt ?? 0;
		const at = a.lastMatchAt ?? 0;
		if (bt !== at) return bt - at;
		return b.wins - a.wins;
	});
	entries.forEach((entry, i) => entry.rank = i + 1);
	
	return entries;
}



// ============================================
// EXPORT STORE STATE (for debugging)
// ============================================
export function getStoreStats() {
	return {
		users: users.size,
		clans: clans.size,
		beefMatches: beefMatches.size,
		arenaMatches: arenaMatches.size,
		tournaments: tournaments.size,
		integrityEvents: integrityEvents.size
	};
}
