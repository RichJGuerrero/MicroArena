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
	LadderEntry,
	UserStats
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

// ============================================
// ID GENERATION
// ============================================
export function generateId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
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
	const userMatches = Array.from(matches.values()).filter(m => {
		const clan = clans.get(m.team1Id) || clans.get(m.team2Id);
		if (!clan) return false;
		const members = clanMembers.get(clan.id);
		return members?.has(userId);
	});
	
	let wins = 0, losses = 0, beefWins = 0, beefLosses = 0, tournamentWins = 0;
	
	for (const match of userMatches) {
		if (match.status !== 'COMPLETED') continue;
		const user = users.get(userId);
		if (!user?.clanId) continue;
		
		if (match.winnerId === user.clanId) {
			wins++;
			if (match.type === 'BEEF') beefWins++;
			if (match.type === 'TOURNAMENT') tournamentWins++;
		} else {
			losses++;
			if (match.type === 'BEEF') beefLosses++;
		}
	}
	
	const totalMatches = wins + losses;

	// V0 XP model (transparent + easy to tune later)
	// - Participation matters most: 100 XP per completed match
	// - Small win bonus: +50 XP per win
	// This is intentionally simple for launch and can be replaced by a richer XP system later.
	const xp = (totalMatches * 100) + (wins * 50);

	return {
		totalMatches,
		xp,
		wins,
		losses,
		winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
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

export function completeBeefMatch(id: string, winnerId: string, challengerScore: number, challengedScore: number): BeefMatch {
	const beef = beefMatches.get(id);
	if (!beef) throw new Error('Beef match not found');
	
	beef.status = 'COMPLETED';
	beef.winnerId = winnerId;
	beef.challengerScore = challengerScore;
	beef.challengedScore = challengedScore;
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
		const clanBeefs = getBeefMatchesForClan(clan.id).filter(b => b.status === 'COMPLETED');
		
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
		tournaments: tournaments.size,
		integrityEvents: integrityEvents.size
	};
}
