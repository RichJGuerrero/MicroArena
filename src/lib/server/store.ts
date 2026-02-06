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
	ArenaMatch,
	ArenaMatchView,
	ArenaSideKey,
	MatchQueue,
	LadderEntry,
	PlayerLadderEntry,
	UserStats,
	ClanStats,
	MatchParticipant,
	ClanInvite,
	InboxItemView
} from '$lib/types';

import fs from 'node:fs';
import path from 'node:path';

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


// Clan invites (invite-only clans)
const clanInvites = new Map<string, ClanInvite>();

// Match Board / Direct Challenges (CMG/GB style)
const arenaMatches = new Map<string, ArenaMatch>();


// ============================================
// PERSISTENCE (Local dev)
// ============================================
// Persists in-memory state to ./data/*.json so server restarts don't wipe V0 progress.
// This is NOT a production persistence layer.

const DATA_DIR = path.resolve(process.cwd(), 'data');

const FILES = {
	users: 'users.json',
	clans: 'clans.json',
	clanMembers: 'clanMembers.json',
	integrityEvents: 'integrityEvents.json',
	beefMatches: 'beefMatches.json',
	tournaments: 'tournaments.json',
	tournamentTeams: 'tournamentTeams.json',
	ladderRatings: 'ladderRatings.json',
	arenaMatches: 'arenaMatches.json',
	clanInvites: 'clanInvites.json'
} as const;

function ensureDataDir() {
	try {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	} catch {
		// ignore
	}
}

function readJson<T>(fileName: string, fallback: T): T {
	try {
		const filePath = path.join(DATA_DIR, fileName);
		if (!fs.existsSync(filePath)) return fallback;
		const raw = fs.readFileSync(filePath, 'utf8');
		if (!raw.trim()) return fallback;
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function writeJson(fileName: string, value: unknown) {
	ensureDataDir();
	const filePath = path.join(DATA_DIR, fileName);
	const tmpPath = filePath + '.tmp';
	const json = JSON.stringify(value, null, 2);
	fs.writeFileSync(tmpPath, json, 'utf8');
	fs.renameSync(tmpPath, filePath);
}

function loadFromDisk() {
	ensureDataDir();

	// Users
	users.clear();
	for (const u of readJson(FILES.users, [] as any[])) {
		users.set(u.id, u as any);
	}

	// Clans
	clans.clear();
	for (const c of readJson(FILES.clans, [] as any[])) {
		clans.set(c.id, c as any);
	}

	// Clan members
	clanMembers.clear();
	const cm = readJson(FILES.clanMembers, {} as Record<string, string[]>);
	for (const [clanId, members] of Object.entries(cm)) {
		clanMembers.set(clanId, new Set(members));
	}

	// Integrity
	integrityEvents.clear();
	{
		const raw = readJson(FILES.integrityEvents, [] as any);
		// Back-compat: older broken saves may have written a Map as `{}`.
		const list: any[] = Array.isArray(raw) ? raw : Object.values(raw ?? {});
		for (const ev of list) {
			const e = ev as any;
			if (e?.id) integrityEvents.set(e.id, e);
		}
	}

	// Beef matches
	beefMatches.clear();
	for (const b of readJson(FILES.beefMatches, [] as any[])) {
		beefMatches.set(b.id, b as any);
	}

	// Tournaments
	tournaments.clear();
	for (const t of readJson(FILES.tournaments, [] as any[])) {
		tournaments.set(t.id, t as any);
	}

	// Tournament teams
	tournamentTeams.clear();
	const tt = readJson(FILES.tournamentTeams, {} as Record<string, any[]>);
	for (const [tournamentId, teams] of Object.entries(tt)) {
		const byClan = new Map<string, any>();
		for (const team of teams) byClan.set(team.clanId, team);
		tournamentTeams.set(tournamentId, byClan as any);
	}

	// Ladder ratings
	ladderRatings.clear();
	const lr = readJson(FILES.ladderRatings, {} as Record<string, number>);
	for (const [clanId, rating] of Object.entries(lr)) {
		ladderRatings.set(clanId, rating);
	}

	// Arena matches
	arenaMatches.clear();
	for (const raw of readJson(FILES.arenaMatches, [] as any[])) {
		const m = raw as any;
		// Backward-compatible defaults (older saves may not include these fields)
		if (m.evidence === undefined) m.evidence = [];
		if (m.readyDeadlineAt === undefined) m.readyDeadlineAt = null;
		if (m.readyAAt === undefined) m.readyAAt = null;
		if (m.readyBAt === undefined) m.readyBAt = null;
		if (m.readyABy === undefined) m.readyABy = null;
		if (m.readyBBy === undefined) m.readyBBy = null;
		if (m.reportA === undefined) m.reportA = null;
		if (m.reportB === undefined) m.reportB = null;
		if (m.reportABy === undefined) m.reportABy = null;
		if (m.reportBBy === undefined) m.reportBBy = null;
		if (m.reportAAt === undefined) m.reportAAt = null;
		if (m.reportBAt === undefined) m.reportBAt = null;
		if (m.disputedAt === undefined) m.disputedAt = null;
		if (m.disputeReason === undefined) m.disputeReason = null;
		if (m.resolutionNote === undefined) m.resolutionNote = null;
		if (!Array.isArray(m.evidence)) m.evidence = [];
		arenaMatches.set(m.id, m as any);
	}

	// Clan invites
	clanInvites.clear();
	for (const inv of readJson(FILES.clanInvites, [] as any[])) {
		clanInvites.set(inv.id, inv as any);
	}
}

function saveToDisk() {
	writeJson(FILES.users, Array.from(users.values()));
	writeJson(FILES.clans, Array.from(clans.values()));
	writeJson(
		FILES.clanMembers,
		Object.fromEntries(Array.from(clanMembers.entries()).map(([clanId, members]) => [clanId, Array.from(members.values())]))
	);
	writeJson(FILES.integrityEvents, Array.from(integrityEvents.values()));
	writeJson(FILES.beefMatches, Array.from(beefMatches.values()));
	writeJson(FILES.tournaments, Array.from(tournaments.values()));
	writeJson(
		FILES.tournamentTeams,
		Object.fromEntries(
			Array.from(tournamentTeams.entries()).map(([tournamentId, teamsByClan]) => [
				tournamentId,
				Array.from((teamsByClan as any).values())
			])
		)
	);
	writeJson(FILES.ladderRatings, Object.fromEntries(Array.from(ladderRatings.entries())));
	writeJson(FILES.arenaMatches, Array.from(arenaMatches.values()));
	writeJson(FILES.clanInvites, Array.from(clanInvites.values()));
}

let saveTimer: NodeJS.Timeout | null = null;
function touch() {
	if (saveTimer) return;
	saveTimer = setTimeout(() => {
		saveTimer = null;
		try {
			saveToDisk();
		} catch {
			// ignore
		}
	}, 250);
}

loadFromDisk();

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

// ============================================
// READY-UP (GB/CMG-style)
// ============================================
const READY_UP_GRACE_MS = 10 * 60 * 1000; // 10 minutes

function isArenaRosterFull(m: ArenaMatch): boolean {
	const size = getTeamSize(m.format);
	const aFull = m.teamA.playerIds.length >= size;
	const bFull = m.teamB.playerIds.length >= size;
	if (!aFull || !bFull) return false;
	if (m.scope === 'PLAYER') return true;
	return Boolean(m.teamA.clanId && m.teamB.clanId);
}

function beginArenaReadyUp(m: ArenaMatch, now: number): void {
	// Only transition into READY from OPEN/PENDING flows.
	m.status = 'READY';
	m.readyDeadlineAt = now + READY_UP_GRACE_MS;
	m.readyAAt = null;
	m.readyBAt = null;
	m.readyABy = null;
	m.readyBBy = null;
	m.resolutionNote = null;
}

function sweepArenaReadyUps(now: number = Date.now()): boolean {
	let changed = false;
	for (const m of arenaMatches.values()) {
		if (m.status !== 'READY') continue;

		// Safety: if a READY match lacks a deadline (older save), start a new window.
		if (!m.readyDeadlineAt) {
			m.readyDeadlineAt = now + READY_UP_GRACE_MS;
			m.updatedAt = now;
			arenaMatches.set(m.id, m);
			changed = true;
			continue;
		}

		if (now < m.readyDeadlineAt) continue;

		const aReady = Boolean(m.readyAAt);
		const bReady = Boolean(m.readyBAt);

		// If both are ready but the status never flipped (edge-case), promote to LIVE.
		if (aReady && bReady) {
			m.status = 'LIVE';
			m.readyDeadlineAt = null;
			m.resolutionNote = null;
			m.updatedAt = now;
			arenaMatches.set(m.id, m);
			changed = true;
			continue;
		}

		// Neither side readied: cancel.
		if (!aReady && !bReady) {
			m.status = 'CANCELLED';
			m.completedAt = now;
			m.updatedAt = now;
			m.winnerSide = null;
			m.resolutionNote = 'Auto-cancelled: neither side readied up before the deadline.';
			// Light integrity penalty for everyone involved.
			const allIds = Array.from(new Set([...m.teamA.playerIds, ...m.teamB.playerIds]));
			for (const uid of allIds) {
				try {
					createIntegrityEvent({
						type: 'NO_SHOW',
						targetUserId: uid,
						severity: 2,
						description: `No ready-up: match ${m.id} auto-cancelled`,
						matchId: m.id,
						reportedBy: 'SYSTEM'
					});
				} catch {
					// ignore
				}
			}
			arenaMatches.set(m.id, m);
			changed = true;
			continue;
		}

		// One side readied, other didn't: auto-forfeit.
		const winnerSide: ArenaSideKey = aReady ? 'A' : 'B';
		const loserIds = winnerSide === 'A' ? m.teamB.playerIds : m.teamA.playerIds;

		m.winnerSide = winnerSide;
		m.status = 'COMPLETED';
		m.completedAt = now;
		m.updatedAt = now;
		m.resolutionNote = `Auto-forfeit: Team ${winnerSide === 'A' ? 'B' : 'A'} did not ready up before the deadline.`;

		for (const uid of loserIds) {
			try {
				createIntegrityEvent({
					type: 'NO_SHOW',
					targetUserId: uid,
					severity: 3,
					description: `No ready-up: forfeited match ${m.id}`,
					matchId: m.id,
					reportedBy: 'SYSTEM'
				});
			} catch {
				// ignore
			}
		}

		arenaMatches.set(m.id, m);
		changed = true;
	}

	if (changed) touch();
	return changed;
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
		status:
			arena.status === 'COMPLETED'
				? 'COMPLETED'
				: arena.status === 'DISPUTED'
					? 'DISPUTED'
					: arena.status === 'CANCELLED'
						? 'CANCELLED'
						: 'SCHEDULED',
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
	touch();
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
	touch();
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
		if (won) soloWins++;
		else soloLosses++;
	}
	const soloMatchesPlayed = soloWins + soloLosses;
	const soloXp = soloMatchesPlayed * 100 + soloWins * 50;
	const solo = {
		matchesPlayed: soloMatchesPlayed,
		xp: soloXp,
		wins: soloWins,
		losses: soloLosses,
		winRate: soloMatchesPlayed > 0 ? Math.round((soloWins / soloMatchesPlayed) * 100) : 0
	};

	// Clan/team stats are derived from completed, RANKED matches in the user's current clan.
	let clanWins = 0;
	let clanLosses = 0;
	let beefWins = 0;
	let beefLosses = 0;
	let tournamentWins = 0; // placeholder (no bracket results tracked yet)

	if (user.clanId) {
		const clanBeefs = getBeefMatchesForClan(user.clanId)
			.filter((b) => b.status === 'COMPLETED')
			.filter((b) => (b.queue ?? 'RANKED') === 'RANKED')
			// 1v1 is treated as solo play.
			.filter((b) => b.format !== '1v1');

		for (const beef of clanBeefs) {
			const won = beef.winnerId === user.clanId;
			if (won) {
				clanWins++;
				beefWins++;
			} else {
				clanLosses++;
				beefLosses++;
			}
		}

		const clanArenas = getAllArenaMatches()
			.filter((m) => m.scope === 'CLAN')
			.filter((m) => m.status === 'COMPLETED')
			.filter((m) => m.queue === 'RANKED')
			// 1v1 is treated as solo play.
			.filter((m) => m.format !== '1v1')
			.filter((m) => m.teamA.clanId === user.clanId || m.teamB.clanId === user.clanId);

		for (const m of clanArenas) {
			const winnerClanId =
				m.winnerSide === 'A' ? m.teamA.clanId : m.winnerSide === 'B' ? m.teamB.clanId : null;
			if (winnerClanId === user.clanId) clanWins++;
			else clanLosses++;
		}
	}

	const clanMatchesPlayed = clanWins + clanLosses;
	const clanXp = clanMatchesPlayed * 100 + clanWins * 50;
	const clan = {
		matchesPlayed: clanMatchesPlayed,
		xp: clanXp,
		wins: clanWins,
		losses: clanLosses,
		winRate: clanMatchesPlayed > 0 ? Math.round((clanWins / clanMatchesPlayed) * 100) : 0
	};

	const overallWins = soloWins + clanWins;
	const overallLosses = soloLosses + clanLosses;
	const overallMatchesPlayed = overallWins + overallLosses;
	const overallXp = soloXp + clanXp;
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

	touch();
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
	touch();
	
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
		touch();
		return { disbanded: true };
	}
	
	clanMembers.set(clanId, members);
	recalculateClanIntegrity(clanId);
	touch();
	
	return { disbanded: false };
}

export function updateClan(clanId: string, data: Partial<Clan>): Clan | null {
	const clan = clans.get(clanId);
	if (!clan) return null;
	
	const updated = { ...clan, ...data, updatedAt: Date.now() };
	clans.set(clanId, updated);
	touch();
	return updated;
}

// ============================================
// CLAN INVITE OPERATIONS (Invite-only clans)
// ============================================
export function createClanInvite(data: {
	clanId: string;
	fromUserId: string;
	targetUsername: string;
}): ClanInvite {
	const clan = clans.get(data.clanId);
	if (!clan) throw new Error('Clan not found');
	if (clan.founderId !== data.fromUserId) throw new Error('Only the clan founder can send invites');

	const target = getUserByUsername(data.targetUsername);
	if (!target) throw new Error('User not found');
	if (target.clanId) throw new Error('That user is already in a clan');

	// Prevent duplicate pending invite for this clan/user.
	for (const inv of clanInvites.values()) {
		if (inv.status !== 'PENDING') continue;
		if (inv.clanId === data.clanId && inv.toUserId === target.id) {
			throw new Error('That user already has a pending invite to this clan');
		}
	}

	const now = Date.now();
	const invite: ClanInvite = {
		id: generateId(),
		clanId: data.clanId,
		toUserId: target.id,
		fromUserId: data.fromUserId,
		status: 'PENDING',
		createdAt: now,
		updatedAt: now
	};

	clanInvites.set(invite.id, invite);
	touch();
	return invite;
}

export function getPendingClanInvitesForUser(userId: string): ClanInvite[] {
	return Array.from(clanInvites.values())
		.filter((i) => i.toUserId === userId)
		.filter((i) => i.status === 'PENDING')
		.sort((a, b) => b.createdAt - a.createdAt);
}

export function respondToClanInvite(inviteId: string, userId: string, accept: boolean): ClanInvite {
	const invite = clanInvites.get(inviteId);
	if (!invite) throw new Error('Invite not found');
	if (invite.toUserId !== userId) throw new Error('Only the invited user can respond');
	if (invite.status !== 'PENDING') throw new Error('This invite is not pending');

	const now = Date.now();
	if (!accept) {
		invite.status = 'DECLINED';
		invite.updatedAt = now;
		clanInvites.set(invite.id, invite);
		touch();
		return invite;
	}

	// Accept: join clan, mark invite accepted, cancel other pending invites.
	joinClan(invite.clanId, userId);
	invite.status = 'ACCEPTED';
	invite.updatedAt = now;
	clanInvites.set(invite.id, invite);

	for (const other of clanInvites.values()) {
		if (other.id === invite.id) continue;
		if (other.toUserId !== userId) continue;
		if (other.status !== 'PENDING') continue;
		other.status = 'CANCELLED';
		other.updatedAt = now;
		clanInvites.set(other.id, other);
	}

	touch();
	return invite;
}

// ============================================
// INBOX (Pending only, Option A)
// ============================================
export function getInboxForUser(userId: string): InboxItemView[] {
	const user = users.get(userId);
	if (!user) throw new Error('User not found');

	const items: InboxItemView[] = [];

	// Clan Invites (pending)
	for (const inv of getPendingClanInvitesForUser(userId)) {
		const clan = clans.get(inv.clanId);
		const from = users.get(inv.fromUserId);
		items.push({
			type: 'CLAN_INVITE',
			id: inv.id,
			createdAt: inv.createdAt,
			title: clan ? `Clan Invite: ${clan.tag}` : 'Clan Invite',
			details: `${clan ? clan.name : 'Unknown Clan'} · From ${from ? from.username : 'Unknown'}`,
			href: clan ? `/clans/${clan.tag}` : '/clans'
		});
	}

	// Match Challenges (DIRECT, pending)
	for (const m of getAllArenaMatches()) {
		if (m.visibility !== 'DIRECT') continue;
		if (m.status !== 'PENDING') continue;

		if (m.scope === 'PLAYER') {
			if (m.challengedUserId !== userId) continue;
		} else {
			if (!user.clanId) continue;
			if (m.challengedClanId !== user.clanId) continue;
		}

		const from = users.get(m.createdBy);
		items.push({
			type: 'MATCH_CHALLENGE',
			id: m.id,
			createdAt: m.createdAt,
			title: `Match Challenge: ${m.format.toUpperCase()} · ${m.queue}`,
			details: `${m.scope} · ${m.ruleset} · From ${from ? from.username : 'Unknown'}`,
			href: '/matches'
		});
	}

	items.sort((a, b) => b.createdAt - a.createdAt);
	return items;
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

	touch();
	
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
	touch();
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
	touch();
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
	touch();
	
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
	touch();
	
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
		readyDeadlineAt: null,
		readyAAt: null,
		readyBAt: null,
		readyABy: null,
		readyBBy: null,
		reportA: null,
		reportB: null,
		reportABy: null,
		reportBBy: null,
		reportAAt: null,
		reportBAt: null,
		disputedAt: null,
		disputeReason: null,
		resolutionNote: null,
		evidence: [],
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
	touch();
	return match;
}

export function getArenaMatch(id: string): ArenaMatch | null {
	return arenaMatches.get(id) ?? null;
}

export function getAllArenaMatches(): ArenaMatch[] {
	// Opportunistic timer sweep (no background jobs in V0).
	sweepArenaReadyUps();
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
			touch();
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
			touch();
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
	const now = Date.now();
	if (isArenaRosterFull(match)) {
		beginArenaReadyUp(match, now);
	}

	match.updatedAt = now;
	arenaMatches.set(id, match);
	touch();
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

	const now = Date.now();
	// If both sides are full, begin ready-up instead of immediately going LIVE.
	if (match.status === 'OPEN' && isArenaRosterFull(match)) {
		beginArenaReadyUp(match, now);
	}

	match.updatedAt = now;
	arenaMatches.set(id, match);
	touch();
	return match;
}

export function readyUpArenaMatch(id: string, userId: string): ArenaMatch {
	const match = arenaMatches.get(id);
	if (!match) throw new Error('Match not found');

	// Run a quick sweep first in case the deadline has already passed.
	sweepArenaReadyUps();
	const m = arenaMatches.get(id);
	if (!m) throw new Error('Match not found');
	if (m.status !== 'READY') throw new Error('This match is not awaiting ready-up');

	const isA = m.teamA.playerIds.includes(userId);
	const isB = m.teamB.playerIds.includes(userId);
	if (!isA && !isB) throw new Error('Only match participants can ready up');

	const now = Date.now();
	match.resolutionNote = null;
	if (isA) {
		if (!m.readyAAt) {
			m.readyAAt = now;
			m.readyABy = userId;
		}
	} else {
		if (!m.readyBAt) {
			m.readyBAt = now;
			m.readyBBy = userId;
		}
	}

	match.updatedAt = Date.now();
	// If both sides are ready, promote to LIVE.
	if (m.readyAAt && m.readyBAt) {
		m.status = 'LIVE';
		m.readyDeadlineAt = null;
		m.resolutionNote = null;
	}

	m.updatedAt = now;
	arenaMatches.set(id, m);
	touch();
	return m;
}

export function reportArenaMatchResult(id: string, reporterId: string, reportedWinnerSide: ArenaSideKey): ArenaMatch {
	const match = arenaMatches.get(id);
	if (!match) throw new Error('Match not found');
	if (match.status === 'COMPLETED') return match;
	if (match.status === 'CANCELLED' || match.status === 'DECLINED' || match.status === 'PENDING') {
		throw new Error('This match cannot be reported in its current state');
	}
	if (!(match.status === 'LIVE' || match.status === 'DISPUTED')) {
		throw new Error('Match results can only be reported once the match is LIVE');
	}
	if (reportedWinnerSide !== 'A' && reportedWinnerSide !== 'B') {
		throw new Error('reportedWinnerSide must be A or B');
	}

	const isA = match.teamA.playerIds.includes(reporterId);
	const isB = match.teamB.playerIds.includes(reporterId);
	if (!isA && !isB) throw new Error('Only match participants can report results');

	const now = Date.now();
	if (isA) {
		match.reportA = reportedWinnerSide;
		match.reportABy = reporterId;
		match.reportAAt = now;
	} else {
		match.reportB = reportedWinnerSide;
		match.reportBBy = reporterId;
		match.reportBAt = now;
	}

	// Resolve if both sides have reported.
	const a = match.reportA ?? null;
	const b = match.reportB ?? null;
	if (a && b) {
		if (a === b) {
			match.winnerSide = a;
			match.status = 'COMPLETED';
			match.completedAt = now;
			match.disputedAt = null;
			match.disputeReason = null;
		} else {
			match.winnerSide = null;
			match.status = 'DISPUTED';
			match.disputedAt = now;
			match.disputeReason = `Conflicting reports (A→${a}, B→${b})`;
		}
	}

	match.updatedAt = now;
	arenaMatches.set(id, match);
	touch();
	return match;
}

// ============================================
// EVIDENCE (Disputes)
// ============================================
export function addArenaMatchEvidence(id: string, userId: string, url: string, note?: string | null): ArenaMatch {
	const match = arenaMatches.get(id);
	if (!match) throw new Error('Match not found');
	const u = (url ?? '').trim();
	if (!u) throw new Error('url is required');
	if (!(u.startsWith('http://') || u.startsWith('https://'))) throw new Error('url must start with http:// or https://');

	const isA = match.teamA.playerIds.includes(userId);
	const isB = match.teamB.playerIds.includes(userId);
	if (!isA && !isB) throw new Error('Only match participants can add evidence');
	const side: ArenaSideKey = isA ? 'A' : 'B';

	if (!Array.isArray((match as any).evidence)) (match as any).evidence = [];
	const evidence = (match as any).evidence as any[];
	// Soft cap to prevent spam / runaway payloads.
	if (evidence.length >= 40) throw new Error('Evidence limit reached for this match');

	const now = Date.now();
	evidence.push({
		id: generateId(),
		side,
		url: u,
		note: (note ?? '').trim() || null,
		addedBy: userId,
		addedAt: now
	});

	match.updatedAt = now;
	arenaMatches.set(id, match);
	touch();
	return match;
}

export function removeArenaMatchEvidence(id: string, userId: string, evidenceId: string): ArenaMatch {
	const match = arenaMatches.get(id);
	if (!match) throw new Error('Match not found');
	const eid = (evidenceId ?? '').trim();
	if (!eid) throw new Error('evidenceId is required');
	if (!Array.isArray((match as any).evidence)) (match as any).evidence = [];
	const evidence = (match as any).evidence as any[];
	const idx = evidence.findIndex((e) => e && e.id === eid);
	if (idx < 0) throw new Error('Evidence item not found');
	const item = evidence[idx] as any;
	// V0: only the user who added the evidence can remove it.
	if (item.addedBy !== userId) throw new Error('You can only remove evidence you added');
	evidence.splice(idx, 1);
	match.updatedAt = Date.now();
	arenaMatches.set(id, match);
	touch();
	return match;
}

export function completeArenaMatch(id: string, winnerSide: ArenaSideKey, scoreA?: number, scoreB?: number): ArenaMatch {
	const match = arenaMatches.get(id);
	if (!match) throw new Error('Match not found');
	if (match.status === 'COMPLETED') return match;
	if (!(match.status === 'LIVE' || match.status === 'OPEN' || match.status === 'READY')) {
		throw new Error('Match cannot be completed in its current state');
	}

	const now = Date.now();
	match.winnerSide = winnerSide;
	match.scoreA = typeof scoreA === 'number' ? scoreA : match.scoreA;
	match.scoreB = typeof scoreB === 'number' ? scoreB : match.scoreB;
	match.status = 'COMPLETED';
	match.completedAt = now;
	match.updatedAt = now;
	match.readyDeadlineAt = null;
	match.resolutionNote = null;
	// Stamp reports for UI consistency (creator/admin override).
	match.reportA = winnerSide;
	match.reportB = winnerSide;
	match.reportABy = match.createdBy;
	match.reportBBy = match.createdBy;
	match.reportAAt = now;
	match.reportBAt = now;
	match.disputedAt = null;
	match.disputeReason = null;
	arenaMatches.set(id, match);
	touch();
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
		.filter((m) => m.format !== '1v1')
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
	const beefCompleted = getBeefMatchesForClan(clanId)
		.filter((b) => b.status === 'COMPLETED')
		.filter((b) => (b.queue ?? 'RANKED') === 'RANKED')
		// 1v1 is a solo format and does not count toward clan stats.
		.filter((b) => b.format !== '1v1');

	const arenaCompleted = getAllArenaMatches()
		.filter((m) => m.scope === 'CLAN')
		.filter((m) => m.status === 'COMPLETED')
		.filter((m) => m.queue === 'RANKED')
		.filter((m) => m.format !== '1v1')
		.filter((m) => m.teamA.clanId === clanId || m.teamB.clanId === clanId);

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
	const xp = matchesPlayed * 100 + wins * 50;
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
	touch();
	
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
	touch();
	
	return team;
}


// ============================================
// LADDER FILTERING (Tabs)
// ============================================
export type LadderTab = 'SINGLES' | 'DOUBLES' | 'TEAM' | 'CLANS';

function getPlayerXpLadderForFormats(formats: BeefMatch['format'][]): PlayerLadderEntry[] {
	// Only PLAYER-scoped, RANKED, COMPLETED arena matches contribute.
	const eligible = getAllArenaMatches()
		.filter((m) => m.scope === 'PLAYER')
		.filter((m) => m.status === 'COMPLETED')
		.filter((m) => m.queue === 'RANKED')
		.filter((m) => formats.includes(m.format));

	if (eligible.length === 0) return [];

	// Accumulate by userId
	type Agg = { wins: number; losses: number; lastMatchAt: number | null; matchesPlayed: number };
	const agg = new Map<string, Agg>();

	for (const m of eligible) {
		const winnerIds = m.winnerSide === 'A' ? m.teamA.playerIds : m.winnerSide === 'B' ? m.teamB.playerIds : [];
		const loserIds = m.winnerSide === 'A' ? m.teamB.playerIds : m.winnerSide === 'B' ? m.teamA.playerIds : [];

		// If no winner declared, treat as no-op for W/L but still counts as played.
		const allIds = Array.from(new Set([...m.teamA.playerIds, ...m.teamB.playerIds]));
		for (const uid of allIds) {
			const a = agg.get(uid) ?? { wins: 0, losses: 0, lastMatchAt: null, matchesPlayed: 0 };
			a.matchesPlayed += 1;
			if (!a.lastMatchAt || m.updatedAt > a.lastMatchAt) a.lastMatchAt = m.updatedAt;

			if (winnerIds.includes(uid)) a.wins += 1;
			else if (loserIds.includes(uid)) a.losses += 1;
			// else: draw/unknown, no W/L

			agg.set(uid, a);
		}
	}

	const entries: PlayerLadderEntry[] = [];
	for (const [userId, a] of agg.entries()) {
		const user = users.get(userId);
		if (!user) continue;
		const xp = a.matchesPlayed * 100 + a.wins * 50;
		entries.push({
			rank: 0,
			userId,
			user: { id: user.id, username: user.username, integrity: user.integrity, clanId: user.clanId },
			xp,
			matchesPlayed: a.matchesPlayed,
			wins: a.wins,
			losses: a.losses,
			lastMatchAt: a.lastMatchAt
		});
	}

	entries.sort((a, b) => {
		if (b.xp !== a.xp) return b.xp - a.xp;
		const bt = b.lastMatchAt ?? 0;
		const at = a.lastMatchAt ?? 0;
		if (bt !== at) return bt - at;
		return b.wins - a.wins;
	});
	entries.forEach((e, i) => (e.rank = i + 1));

	return entries;
}

function getClanXpLadderForFormats(formats: BeefMatch['format'][]): LadderEntry[] {
	// Only RANKED, COMPLETED matches contribute to ladders.
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

	const entries: LadderEntry[] = [];

	for (const clan of clans.values()) {
		const clanBeefs = eligibleBeefs.filter((b) => b.challengerClanId === clan.id || b.challengedClanId === clan.id);
		const clanArenas = eligibleArenas.filter((m) => m.teamA.clanId === clan.id || m.teamB.clanId === clan.id);
		if (clanBeefs.length + clanArenas.length === 0) continue;

		let wins = 0;
		let losses = 0;
		let lastMatchAt: number | null = null;

		const sortedBeefs = [...clanBeefs].sort((a, b) => b.updatedAt - a.updatedAt);
		for (const beef of sortedBeefs) {
			if (beef.winnerId === clan.id) wins++;
			else losses++;
			if (!lastMatchAt) lastMatchAt = beef.updatedAt;
		}

		const sortedArenas = [...clanArenas].sort((a, b) => b.updatedAt - a.updatedAt);
		for (const m of sortedArenas) {
			const winnerClanId = m.winnerSide === 'A' ? m.teamA.clanId : m.winnerSide === 'B' ? m.teamB.clanId : null;
			if (winnerClanId === clan.id) wins++;
			else losses++;
			if (!lastMatchAt || m.updatedAt > lastMatchAt) lastMatchAt = m.updatedAt;
		}

		const matchesPlayed = wins + losses;
		const xp = matchesPlayed * 100 + wins * 50;

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
	entries.forEach((entry, i) => (entry.rank = i + 1));

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

export function getPlayerLadderForTab(tab: LadderTab): PlayerLadderEntry[] {
	switch (tab) {
		case 'SINGLES':
			return getPlayerXpLadderForFormats(['1v1']);
		case 'DOUBLES':
			return getPlayerXpLadderForFormats(['2v2']);
		case 'TEAM':
			return getPlayerXpLadderForFormats(['3v3', '4v4']);
		case 'CLANS':
		default:
			return [];
	}
}

export type LadderMode = 'CLAN' | 'PLAYER';

export function getLadderForTabV2(tab: LadderTab): { mode: LadderMode; ladder: LadderEntry[] | PlayerLadderEntry[] } {
	switch (tab) {
		case 'CLANS':
			return { mode: 'CLAN', ladder: getClanXpLadderForFormats(['4v4']) };
		case 'SINGLES':
			return { mode: 'PLAYER', ladder: getPlayerXpLadderForFormats(['1v1']) };
		case 'DOUBLES':
			return { mode: 'PLAYER', ladder: getPlayerXpLadderForFormats(['2v2']) };
		case 'TEAM':
			return { mode: 'PLAYER', ladder: getPlayerXpLadderForFormats(['3v3', '4v4']) };
		default:
			return { mode: 'CLAN', ladder: [] };
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
