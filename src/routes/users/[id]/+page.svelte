<script lang="ts">
	// no onMount needed (reactive load)
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { isAuthenticated, isLoading as authLoading, currentUser } from '$lib/auth';
	import { getIntegrityLevel, getIntegrityLabel } from '$lib/types';
	import type { Clan, Match, MatchParticipant, User, UserStats } from '$lib/types';

	let user: User | null = null;
	let clan: Clan | null = null;
	let stats: UserStats | null = null;
	let recentMatches: Match[] = [];
	let isFounder = false;
	let loading = true;
	let notFound = false;
	let error: string | null = null;

	$: userId = $page.params.id;

	function formatPlayers(players?: MatchParticipant[]): string {
		if (!players || players.length === 0) return 'TBD';
		const names = players.map((p) => p.username);
		if (names.length <= 3) return names.join(', ');
		return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
	}

	function getOutcome(myClanId: string | null, m: Match): 'W' | 'L' | null {
		if (!myClanId || !m.winnerId) return null;
		return m.winnerId === myClanId ? 'W' : 'L';
	}

	async function loadUser() {
		loading = true;
		notFound = false;
		error = null;

		try {
			const res = await fetch(`/api/users/${userId}`);
			if (res.status === 404) {
				notFound = true;
				user = null;
				clan = null;
				stats = null;
				recentMatches = [];
				isFounder = false;
				return;
			}
			if (!res.ok) throw new Error('Failed to load user');
			const data = await res.json();
			user = data.user;
			clan = data.clan;
			stats = data.stats;
			recentMatches = data.recentMatches ?? [];
			isFounder = data.isFounder ?? false;
		} catch (e) {
			console.error('Failed to load user profile:', e);
			error = e instanceof Error ? e.message : 'Failed to load user';
		} finally {
			loading = false;
		}
	}

	// Require login to view other users.
	$: if (browser && !$authLoading && !$isAuthenticated) {
		goto('/login');
	}

	// If you clicked yourself, bounce to the main profile page.
	$: if (browser && $currentUser && userId === $currentUser.id) {
		goto('/profile');
	}

	// Load when authenticated + id is ready.
	$: if (browser && !$authLoading && $isAuthenticated && userId) {
		loadUser();
	}

	// (No onMount fetch: reactive block handles initial load and param changes.)

	$: myClanId = clan?.id ?? null;

	// Competitive Overview
	$: overallXp = stats?.overall?.xp ?? 0;
	$: overallMatchesPlayed = stats?.overall?.matchesPlayed ?? 0;
	$: overallWins = stats?.overall?.wins ?? 0;
	$: overallLosses = stats?.overall?.losses ?? 0;
	$: overallWinRate = stats?.overall?.winRate ?? 0;

	$: soloMatchesPlayed = stats?.solo?.matchesPlayed ?? 0;
	$: soloWins = stats?.solo?.wins ?? 0;
	$: soloLosses = stats?.solo?.losses ?? 0;
	$: soloWinRate = stats?.solo?.winRate ?? 0;

	$: clanMatchesPlayed = stats?.clan?.matchesPlayed ?? 0;
	$: clanWins = stats?.clan?.wins ?? 0;
	$: clanLosses = stats?.clan?.losses ?? 0;
	$: clanWinRate = stats?.clan?.winRate ?? 0;
</script>

<svelte:head>
	<title>{user ? `${user.username} — Profile` : 'User Profile'} — MicroArena</title>
</svelte:head>

<div class="container narrow">
	{#if loading || $authLoading}
		<div class="loading"><div class="spinner"></div></div>
	{:else if notFound}
		<div class="card empty-state">
			<div class="empty-state-icon">🫥</div>
			<h2>User not found</h2>
			<p class="text-muted">That profile link doesn’t resolve.</p>
			<div class="actions">
				<a href="/clans" class="btn">Browse Clans</a>
				<a href="/" class="btn ghost">Home</a>
			</div>
		</div>
	{:else if error}
		<div class="card empty-state">
			<div class="empty-state-icon">⚠️</div>
			<h2>Couldn’t load profile</h2>
			<p class="text-muted">{error}</p>
			<div class="actions">
				<button class="btn" on:click={loadUser}>Retry</button>
				<a href="/clans" class="btn ghost">Browse Clans</a>
			</div>
		</div>
	{:else if user}
		<div class="profile-page">
			<header class="profile-header card">
				<div class="profile-identity">
					<div class="avatar lg">{user.username.charAt(0)}</div>
					<div class="profile-info">
						<h1>{user.username}</h1>
						<p class="text-muted">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
					</div>
				</div>
			</header>

			<section class="profile-section card">
				<h2>Competitive Overview</h2>
				<div class="overview-grid">
					<div class="stat">
						<span class="stat-value text-accent">{overallXp}</span>
						<span class="stat-label">XP</span>
					</div>
					<div class="stat">
						<span class="stat-value">{overallMatchesPlayed}</span>
						<span class="stat-label">Matches Played</span>
					</div>
					<div class="stat">
						<span class="stat-value" style="color: var(--success)">{overallWins}</span>
						<span class="stat-label">Wins</span>
					</div>
					<div class="stat">
						<span class="stat-value" style="color: var(--error)">{overallLosses}</span>
						<span class="stat-label">Losses</span>
					</div>
					<div class="stat">
						<span class="stat-value {getIntegrityLevel(user.integrity)}">{user.integrity}</span>
						<span class="stat-label">Integrity</span>
					</div>
				</div>
				<p class="overview-subtext text-muted mt-sm">
					Win Rate: <span class="text-accent">{overallWinRate}%</span>
				</p>

				<div class="split-overview mt-md">
					<div class="split-card">
						<div class="split-title">Solo (1v1)</div>
						<div class="split-line text-secondary">
							<span class="mono">{soloWins}W</span> <span class="text-muted">-</span>
							<span class="mono">{soloLosses}L</span>
							<span class="pill">{soloMatchesPlayed} matches</span>
							<span class="pill">{soloWinRate}% WR</span>
						</div>
						<p class="text-muted small mt-xs">Solo matches never affect clan stats.</p>
					</div>
					<div class="split-card">
						<div class="split-title">Clan (2v2+)</div>
						<div class="split-line text-secondary">
							<span class="mono">{clanWins}W</span> <span class="text-muted">-</span>
							<span class="mono">{clanLosses}L</span>
							<span class="pill">{clanMatchesPlayed} matches</span>
							<span class="pill">{clanWinRate}% WR</span>
						</div>
						{#if !clan}
							<p class="text-muted small mt-xs">Not currently in a clan.</p>
						{:else}
							<p class="text-muted small mt-xs">Team play counts toward clan ladders.</p>
						{/if}
					</div>
				</div>
			</section>

			<section class="profile-section card">
				<h2>Integrity</h2>
				<div class="integrity-display">
					<span class="integrity-score {getIntegrityLevel(user.integrity)}">{user.integrity}</span>
					<span class="integrity-label">{getIntegrityLabel(user.integrity)}</span>
				</div>
				<div class="integrity-bar">
					<div class="integrity-fill" style="width: {user.integrity}%"></div>
				</div>
			</section>

			<section class="profile-section card">
				<h2>Clan</h2>
				{#if clan}
					<div class="clan-info">
						<a href="/clans/{clan.tag}" class="clan-link">
							<span class="clan-tag">{clan.tag}</span>
							<span class="clan-name">{clan.name}</span>
						</a>
						{#if isFounder}
							<span class="founder-badge">★ Founder</span>
						{/if}
					</div>
					<p class="mt-sm text-muted">Clan Integrity: <span class="text-accent">{clan.integrity}</span></p>
				{:else}
					<p class="text-muted">Not in a clan.</p>
				{/if}
			</section>

			<section class="profile-section card">
				<h2>Recent Clan Matches</h2>
				{#if recentMatches.length === 0}
					<p class="text-muted">No clan matches yet.</p>
				{:else}
					<div class="match-list">
						{#each recentMatches as m (m.id)}
							<div class="match-row">
								<div class="match-top">
									<div class="match-left">
										{#if getOutcome(myClanId, m) === 'W'}
											<span class="badge success">W</span>
										{:else if getOutcome(myClanId, m) === 'L'}
											<span class="badge error">L</span>
										{:else}
											<span class="badge">—</span>
										{/if}
										<span class="match-date text-muted">{m.completedAt ? new Date(m.completedAt).toLocaleDateString() : 'TBD'}</span>
									</div>
									<div class="match-score">
										<span class="tag">{m.team1.tag}</span>
										<span class="vs">vs</span>
										<span class="tag">{m.team2.tag}</span>
										{#if m.team1Score !== null && m.team2Score !== null}
											<span class="score text-muted">{m.team1Score}-{m.team2Score}</span>
										{/if}
									</div>
								</div>

								<div class="match-players text-secondary">
									<span class="players">{formatPlayers(m.team1Players)}</span>
									<span class="vs">vs</span>
									<span class="players">{formatPlayers(m.team2Players)}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<div class="footer-actions">
				<button class="btn ghost" on:click={() => history.back()}>← Back</button>
				<a class="btn" href="/clans">Clans</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.loading {
		display: flex;
		justify-content: center;
		padding: var(--space-3xl);
	}

	.profile-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		padding: var(--space-xl) 0;
	}

	.profile-identity {
		display: flex;
		gap: var(--space-lg);
		align-items: center;
	}

	.profile-info h1 {
		margin: 0;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	@media (max-width: 900px) {
		.overview-grid { grid-template-columns: repeat(2, 1fr); }
	}

	.stat {
		text-align: center;
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		background: rgba(255,255,255,0.02);
		border: 1px solid var(--border);
	}
	.stat-value {
		font-size: 1.2rem;
		font-weight: 800;
		display: block;
	}
	.stat-value.high { color: var(--integrity-high); }
	.stat-value.good { color: var(--integrity-good); }
	.stat-value.medium { color: var(--integrity-medium); }
	.stat-value.low { color: var(--integrity-low); }
	.stat-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.split-overview {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}
	@media (max-width: 900px) {
		.split-overview { grid-template-columns: 1fr; }
	}
	.split-card {
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		background: rgba(255,255,255,0.02);
	}
	.split-title {
		font-weight: 800;
		margin-bottom: var(--space-xs);
	}
	.split-line {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		align-items: center;
	}
	.pill {
		border: 1px solid var(--border);
		background: rgba(255,255,255,0.02);
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}
	.small { font-size: 0.85rem; }

	.integrity-display {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		margin-top: var(--space-sm);
	}
	.integrity-score {
		font-size: 2.25rem;
		font-weight: 900;
	}
	.integrity-score.high { color: var(--integrity-high); }
	.integrity-score.good { color: var(--integrity-good); }
	.integrity-score.medium { color: var(--integrity-medium); }
	.integrity-score.low { color: var(--integrity-low); }
	.integrity-label { color: var(--text-secondary); font-weight: 600; }
	.integrity-bar {
		margin-top: var(--space-sm);
		height: 10px;
		background: rgba(255,255,255,0.06);
		border-radius: 999px;
		overflow: hidden;
		border: 1px solid var(--border);
	}
	.integrity-fill {
		height: 100%;
		background: var(--accent);
		box-shadow: 0 0 18px var(--accent-glow);
	}

	.clan-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-xs);
	}
	.clan-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		text-decoration: none;
	}
	.clan-tag {
		font-family: var(--font-mono);
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: rgba(255,255,255,0.03);
		color: var(--text-primary);
	}
	.clan-name { color: var(--text-secondary); font-weight: 600; }

	.match-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-sm);
	}
	.match-row {
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		background: rgba(255,255,255,0.02);
	}
	.match-top {
		display: flex;
		justify-content: space-between;
		gap: var(--space-md);
		align-items: center;
	}
	.match-left { display: flex; align-items: center; gap: var(--space-sm); }
	.match-score { display: flex; align-items: center; gap: var(--space-sm); }
	.tag { font-family: var(--font-mono); }
	.score { margin-left: var(--space-sm); }
	.match-players {
		margin-top: var(--space-sm);
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.empty-state {
		padding: var(--space-xl);
		text-align: center;
	}
	.empty-state-icon {
		font-size: 2.25rem;
		margin-bottom: var(--space-sm);
	}
	.actions {
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		margin-top: var(--space-md);
		flex-wrap: wrap;
	}
	.footer-actions {
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
	}
	@media (max-width: 640px) {
		.footer-actions { justify-content: stretch; }
		.footer-actions :global(.btn) { flex: 1; }
	}
</style>
