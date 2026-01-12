// ============================================
// AUTH TYPES
// ============================================
export interface AuthUser {
	id: string;              // Auth0 user ID (sub)
	email: string;
	emailVerified: boolean;
	name: string | null;
	picture: string | null;
	updatedAt: string;
}

// ============================================
// USER TYPES
// ============================================
export interface User {
	id: string;               // Auth0 user ID (sub) - primary key
	username: string;         // Display username
	usernameKey: string;      // Lowercase normalized for uniqueness
	email: string;
	avatar: string | null;
	clanId: string | null;    // Current clan ID
	integrity: number;        // 0-100, starts at 100
	createdAt: number;
	updatedAt: number;
}

export interface UserProfile extends User {
	clan: Clan | null;
	isFounder: boolean;
	stats: UserStats;
	recentMatches: Match[];
}

export interface RecordLine {
	matchesPlayed: number;
	xp: number;
	wins: number;
	losses: number;
	winRate: number;
}

export interface UserStats {
	/** Combined totals across solo + clan */
	overall: RecordLine;
	/** 1v1 / solo play (does NOT affect clan stats) */
	solo: RecordLine;
	/** Clan/team play (2v2+) */
	clan: RecordLine;

	// V0 compatibility / future placeholders
	beefWins: number;
	beefLosses: number;
	tournamentWins: number;
}

// ============================================
// CLAN TYPES
// ============================================
export interface Clan {
	id: string;
	tag: string;              // Display tag (2-6 chars)
	tagKey: string;           // Uppercase normalized
	name: string;
	description: string;
	founderId: string;        // User ID of founder
	integrity: number;        // Average of members
	memberCount: number;
	createdAt: number;
	updatedAt: number;
}

export interface ClanWithMembers extends Clan {
	members: ClanMember[];
	founder: ClanMember;
}

export interface ClanMember {
	id: string;
	username: string;
	avatar: string | null;
	integrity: number;
	isFounder: boolean;
	joinedAt: number;
}

export interface ClanStats {
	clanId: string;
	xp: number;
	matchesPlayed: number;
	wins: number;
	losses: number;
	winRate: number;
	lastMatchAt: number | null;
}

// ============================================
// INTEGRITY TYPES
// ============================================
export type IntegrityEventType =
	| 'STALLING'
	| 'NO_SHOW'
	| 'CHEATING'
	| 'TOXICITY'
	| 'DISPUTE_ABUSE'
	| 'UNSPORTSMANLIKE'
	| 'MATCH_MANIPULATION'
	| 'RESTORED';

export interface IntegrityEvent {
	id: string;
	type: IntegrityEventType;
	targetUserId: string;
	targetClanId: string | null;
	severity: number;         // 1-5, multiplied by 5 for point deduction
	description: string;
	reportedBy: string | null; // User ID or 'SYSTEM'
	matchId: string | null;
	resolved: boolean;
	createdAt: number;
}

// ============================================
// BEEF MATCH TYPES
// ============================================
export type BeefFormat = '1v1' | '2v2' | '3v3' | '4v4' | '5v5';
export type BeefStatus =
	| 'PENDING'
	| 'ACCEPTED'
	| 'DECLINED'
	| 'SCHEDULED'
	| 'LIVE'
	| 'COMPLETED'
	| 'DISPUTED'
	| 'CANCELLED';

export interface BeefMatch {
	id: string;
	format: BeefFormat;
	/** Ranked or Unranked queue (defaults to RANKED if omitted). */
	queue?: MatchQueue;
	challengerClanId: string;
	challengedClanId: string;
	challengerClan?: Clan;
	challengedClan?: Clan;
	ruleset: string;
	scheduledTime: number | null;
	status: BeefStatus;
	refRequired: boolean;
	streamRequired: boolean;
	streamUrl: string | null;
	winnerId: string | null;   // Clan ID
	challengerScore: number | null;
	challengedScore: number | null;
	// Optional participant tracking (future: recorded at match completion)
	challengerPlayerIds?: string[];
	challengedPlayerIds?: string[];
	createdBy: string;         // User ID
	createdAt: number;
	updatedAt: number;
}

// ============================================
// TOURNAMENT TYPES
// ============================================
export type TournamentTier = 'SHOWCASE' | 'PREMIER' | 'OPEN';
export type TournamentStatus =
	| 'DRAFT'
	| 'REGISTRATION_OPEN'
	| 'REGISTRATION_CLOSED'
	| 'LIVE'
	| 'COMPLETED'
	| 'CANCELLED';

export interface Tournament {
	id: string;
	name: string;
	description: string;
	tier: TournamentTier;
	game: string;
	format: BeefFormat;
	maxTeams: number;
	integrityRequirement: number;
	prizeDescription: string | null;
	registrationDeadline: number;
	startTime: number;
	status: TournamentStatus;
	createdAt: number;
	updatedAt: number;
}

export interface TournamentWithTeams extends Tournament {
	registeredTeams: TournamentTeam[];
	bracket: TournamentBracket | null;
}

export interface TournamentTeam {
	clanId: string;
	clan: Clan;
	seed: number | null;
	registeredAt: number;
	registeredBy: string;
}

export interface TournamentBracket {
	rounds: TournamentRound[];
}

export interface TournamentRound {
	roundNumber: number;
	matches: TournamentMatch[];
}

export interface TournamentMatch {
	id: string;
	team1Id: string | null;
	team2Id: string | null;
	team1Score: number | null;
	team2Score: number | null;
	winnerId: string | null;
	scheduledTime: number | null;
	completedAt: number | null;
}

// ============================================
// MATCH TYPES (General)
// ============================================
export type MatchType = 'BEEF' | 'TOURNAMENT' | 'LADDER';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';

// A match can either be played under a clan banner (counts for clan stats)
// or as a pure player/solo match (does NOT affect clan stats).
export type MatchScope = 'CLAN' | 'PLAYER';

// Ranked matches affect ladders/XP; Unranked matches are for practice/fun.
export type MatchQueue = 'RANKED' | 'UNRANKED';

export interface Match {
	id: string;
	/** CLAN matches count for clan stats, PLAYER matches do not. */
	scope: MatchScope;
	/** Display format (1v1, 2v2, etc). */
	format: BeefFormat;
	/** Ranked or Unranked queue. */
	queue: MatchQueue;
	type: MatchType;
	referenceId: string;      // BeefMatch ID or Tournament ID
	team1Id: string;
	team2Id: string;
	team1: Clan;
	team2: Clan;
	// Optional participant info (used for match history UI)
	team1PlayerIds?: string[];
	team2PlayerIds?: string[];
	team1Players?: MatchParticipant[];
	team2Players?: MatchParticipant[];
	team1Score: number | null;
	team2Score: number | null;
	winnerId: string | null;
	status: MatchStatus;
	scheduledTime: number | null;
	completedAt: number | null;
	createdAt: number;
}

export interface MatchParticipant {
	id: string;
	username: string;
}

// ============================================
// LADDER TYPES
// ============================================
export interface LadderEntry {
	rank: number;
	clanId: string;
	clan: Clan;
	xp: number;
	matchesPlayed: number;
	wins: number;
	losses: number;
	lastMatchAt: number | null;
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T = void> {
	success: boolean;
	data?: T;
	error?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getIntegrityLevel(score: number): 'high' | 'good' | 'medium' | 'low' {
	if (score >= 90) return 'high';
	if (score >= 70) return 'good';
	if (score >= 50) return 'medium';
	return 'low';
}

export function getIntegrityLabel(score: number): string {
	if (score >= 90) return 'Excellent';
	if (score >= 70) return 'Good';
	if (score >= 50) return 'Fair';
	return 'Poor';
}

export function canAccessTier(integrity: number, tier: TournamentTier): boolean {
	switch (tier) {
		case 'SHOWCASE': return integrity === 100;
		case 'PREMIER': return integrity >= 90;
		case 'OPEN': return integrity >= 50;
		default: return false;
	}
}

export function normalizeUsername(username: string): string {
	return username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
}

export function normalizeTag(tag: string): string {
	return tag.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
}
