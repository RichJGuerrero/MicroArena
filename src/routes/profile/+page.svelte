<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { isAuthenticated, currentUser } from '$lib/auth';
	import { getIntegrityLevel, getIntegrityLabel } from '$lib/types';
	import type { Clan, Match, MatchParticipant, UserStats } from '$lib/types';
	
	let clan: Clan | null = null;
	let stats: UserStats | null = null;
	let recentMatches: Match[] = [];
	let isFounder = false;
	let loading = true;

	$: myClanId = clan?.id ?? null;

	function formatPlayers(players?: MatchParticipant[]): string {
		if (!players || players.length === 0) return 'TBD';
		const names = players.map(p => p.username);
		if (names.length <= 3) return names.join(', ');
		return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
	}

	function getOutcome(m: Match): 'W' | 'L' | null {
		if (!myClanId || !m.winnerId) return null;
		return m.winnerId === myClanId ? 'W' : 'L';
	}

	// Competitive Overview (V0)
	$: xp = stats?.xp ?? 0;
	$: matchesPlayed = stats?.totalMatches ?? 0;
	$: wins = stats?.wins ?? 0;
	$: losses = stats?.losses ?? 0;
	$: winRate = stats?.winRate ?? 0;
	
	$: if (!$isAuthenticated && !loading) {
		goto('/login');
	}
	
	onMount(async () => {
		if (!$currentUser) {
			loading = false;
			return;
		}
		
		try {
			const res = await fetch(`/api/users/${$currentUser.id}`);
			if (res.ok) {
				const data = await res.json();
				clan = data.clan;
				stats = data.stats;
				recentMatches = data.recentMatches ?? [];
				isFounder = data.isFounder;
			}
		} catch (e) {
			console.error('Failed to load profile:', e);
		}
		loading = false;
	});
</script>

<svelte:head>
	<title>Profile — MicroArena</title>
</svelte:head>

<div class="container narrow">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
		</div>
	{:else if $currentUser}
		<div class="profile-page">
			<header class="profile-header card">
				<div class="profile-identity">
					<div class="avatar lg">{$currentUser.username.charAt(0)}</div>
					<div class="profile-info">
						<h1>{$currentUser.username}</h1>
						<p class="text-muted">Member since {new Date($currentUser.createdAt).toLocaleDateString()}</p>
					</div>
				</div>
			</header>
			
			<section class="profile-section card">
				<h2>Competitive Overview</h2>
				<div class="overview-grid">
					<div class="stat">
						<span class="stat-value text-accent">{xp}</span>
						<span class="stat-label">XP</span>
					</div>
					<div class="stat">
						<span class="stat-value">{matchesPlayed}</span>
						<span class="stat-label">Matches Played</span>
					</div>
					<div class="stat">
						<span class="stat-value" style="color: var(--success)">{wins}</span>
						<span class="stat-label">Wins</span>
					</div>
					<div class="stat">
						<span class="stat-value" style="color: var(--error)">{losses}</span>
						<span class="stat-label">Losses</span>
					</div>
					<div class="stat">
						<span class="stat-value {getIntegrityLevel($currentUser.integrity)}">{$currentUser.integrity}</span>
						<span class="stat-label">Integrity</span>
					</div>
				</div>
				<p class="overview-subtext text-muted mt-sm">Win Rate: <span class="text-accent">{winRate}%</span></p>
			</section>
			
			<section class="profile-section card">
				<h2>Integrity</h2>
				<div class="integrity-display">
					<span class="integrity-score {getIntegrityLevel($currentUser.integrity)}">
						{$currentUser.integrity}
					</span>
					<span class="integrity-label">{getIntegrityLabel($currentUser.integrity)}</span>
				</div>
				<div class="integrity-bar">
					<div class="integrity-fill" style="width: {$currentUser.integrity}%"></div>
				</div>
				<p class="integrity-status">
					{#if $currentUser.integrity === 100}
						✓ You have access to all tournament tiers including Showcase
					{:else if $currentUser.integrity >= 90}
						You can join Premier and Open tournaments
					{:else if $currentUser.integrity >= 50}
						You can join Open tournaments only
					{:else}
						Your tournament access is restricted
					{/if}
				</p>

				<div class="integrity-explainer mt-md">
					<p class="text-secondary">
						Integrity impacts tournament eligibility and reflects reliable, good-faith play.
					</p>
					<ul class="bullets mt-sm">
						<li>Stalling, dispute abuse, no-shows, and toxic conduct can lower Integrity.</li>
						<li><strong>Cheating is a permanent ban</strong>, not a score penalty.</li>
					</ul>
					<a class="btn ghost sm mt-sm" href="/integrity">View Integrity System →</a>
				</div>
			</section>

			<section class="profile-section card">
				<h2>Recent Matches</h2>
				{#if recentMatches.length === 0}
					<p class="text-muted">No matches yet. Your first win starts with a Beef Match.</p>
				{:else}
					<div class="match-list">
						{#each recentMatches as m (m.id)}
							<div class="match-row">
								<div class="match-top">
									<div class="match-left">
										{#if getOutcome(m) === 'W'}
											<span class="badge success">W</span>
										{:else if getOutcome(m) === 'L'}
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
					<p class="mt-sm text-muted">
						Clan Integrity: <span class="text-accent">{clan.integrity}</span>
					</p>
				{:else}
					<p class="text-muted">
						You're not in a clan yet.
						<a href="/clans">Browse clans</a> or create your own.
					</p>
				{/if}
			</section>
			
			
			
			{#if !clan}
				<section class="profile-section card cta-section">
					<h2>Get Started</h2>
					<p>Join a clan to start competing with others.</p>
					<div class="cta-actions">
						<a href="/clans" class="btn">Browse Clans</a>
					</div>
				</section>
			{/if}
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
	
	.profile-header { padding: var(--space-xl); }
	
	.profile-identity {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
	}
	
	.profile-info h1 { margin-bottom: var(--space-xs); }
	
	.profile-section h2 {
		font-size: 1.125rem;
		margin-bottom: var(--space-md);
	}

	.match-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.match-row {
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		transition: border-color 0.2s ease, background 0.2s ease;
	}
	.match-row:hover {
		background: var(--bg-hover);
		border-color: var(--border-light);
	}

	.match-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.match-left {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.match-score {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		font-weight: 600;
	}

	.match-date {
		font-size: 0.875rem;
	}

	.match-players {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.875rem;
		flex-wrap: wrap;
	}

	.players {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.score {
		font-family: var(--font-mono);
		font-weight: 700;
		margin-left: var(--space-sm);
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: var(--space-lg);
	}

	.overview-subtext {
		font-size: 0.9375rem;
	}
	
	.integrity-display {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}
	
	.integrity-score {
		font-family: var(--font-mono);
		font-size: 3rem;
		font-weight: 700;
		line-height: 1;
	}
	.integrity-score.high { color: var(--integrity-high); }
	.integrity-score.good { color: var(--integrity-good); }
	.integrity-score.medium { color: var(--integrity-medium); }
	.integrity-score.low { color: var(--integrity-low); }
	
	.integrity-label {
		font-size: 1.25rem;
		color: var(--text-muted);
	}
	
	.integrity-bar {
		height: 8px;
		background: var(--bg-tertiary);
		border-radius: var(--radius-full);
		overflow: hidden;
		margin-bottom: var(--space-md);
	}
	
	.integrity-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent) 0%, var(--integrity-high) 100%);
		border-radius: var(--radius-full);
	}
	
	.integrity-status {
		font-size: 0.9375rem;
		color: var(--text-secondary);
	}
	
	.clan-info {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}
	
	.clan-link {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	
	.clan-name {
		color: var(--text-primary);
		font-weight: 500;
	}
	
	.stat {
		text-align: center;
	}
	
	.stat-value {
		font-family: var(--font-mono);
		font-size: 1.5rem;
		font-weight: 700;
		display: block;
		line-height: 1.1;
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
	
	.cta-section { text-align: center; }
	.cta-section p { margin-bottom: var(--space-lg); }
	
	@media (max-width: 640px) {
		.profile-identity { flex-direction: column; text-align: center; }
		.overview-grid { grid-template-columns: repeat(2, 1fr); }
	}


	.integrity-explainer {
		border-top: 1px solid var(--border);
		padding-top: var(--space-md);
	}

	.bullets {
		margin: 0;
		padding-left: 1.2rem;
		display: grid;
		gap: var(--space-xs);
		color: var(--text-secondary);
	}
	.bullets li strong { color: var(--text-primary); }

	.match-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.match-row {
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.match-row:hover {
		background: var(--bg-hover);
		border-color: var(--border-light);
	}

	.match-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
	}

	.match-left {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.match-score {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		font-weight: 700;
	}

	.score {
		font-family: var(--font-mono);
		margin-left: var(--space-xs);
	}

	.match-players {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.9375rem;
		flex-wrap: wrap;
	}

	.players {
		font-family: var(--font-mono);
		font-size: 0.875rem;
	}

	.vs {
		color: var(--text-muted);
		font-weight: 600;
	}
</style>
