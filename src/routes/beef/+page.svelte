<script lang="ts">
	import { onMount } from 'svelte';
	import { isAuthenticated, currentUser, refreshUser } from '$lib/auth';
	import type { BeefMatch, Clan } from '$lib/types';
	import ComingSoon from '$lib/components/ComingSoon.svelte';

	// POLISH PHASE: Feature is staged but intentionally inactive.
	// Flip to true when Beef Matches are ready to go live.
	const FEATURE_ENABLED = false;

	let beefMatches: BeefMatch[] = [];
	let clans: Clan[] = [];
	let loading = true;
	let showCreateForm = false;
	let creating = false;
	let error = '';

	// Form fields
	let challengedClanId = '';
	let format = '4v4';
	let ruleset = '';
	let refRequired = true;
	let streamRequired = false;

	onMount(async () => {
		if (!FEATURE_ENABLED) {
			loading = false;
			return;
		}

		await Promise.all([loadBeefMatches(), loadClans()]);
	});

	async function loadBeefMatches() {
		try {
			const res = await fetch('/api/beef');
			if (res.ok) {
				const data = await res.json();
				beefMatches = data.beefMatches;
			}
		} catch (e) {
			console.error(e);
		}
		loading = false;
	}

	async function loadClans() {
		try {
			const res = await fetch('/api/clans');
			if (res.ok) {
				const data = await res.json();
				clans = data.clans;
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function createBeefMatch() {
		if (!$currentUser?.clanId) return;
		error = '';
		creating = true;

		try {
			const res = await fetch('/api/beef', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					format,
					challengerClanId: $currentUser.clanId,
					challengedClanId,
					ruleset,
					refRequired,
					streamRequired,
					createdBy: $currentUser.id
				})
			});

			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to create';
				creating = false;
				return;
			}

			showCreateForm = false;
			challengedClanId = '';
			ruleset = '';
			await loadBeefMatches();
		} catch (e) {
			error = 'Network error';
		}
		creating = false;
	}

	async function respondToBeef(beefId: string, accept: boolean) {
		if (!$currentUser) return;

		try {
			await fetch(`/api/beef/${beefId}/respond`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accept, userId: $currentUser.id })
			});
			await loadBeefMatches();
		} catch (e) {
			console.error(e);
		}
	}

	function formatDate(ts: number | null): string {
		if (!ts) return 'TBD';
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getStatusClass(status: string): string {
		switch (status) {
			case 'LIVE':
				return 'live';
			case 'PENDING':
			case 'ACCEPTED':
				return 'upcoming';
			case 'COMPLETED':
				return 'completed';
			default:
				return 'pending';
		}
	}

	$: activeMatches = beefMatches.filter((m) => ['PENDING', 'ACCEPTED', 'LIVE'].includes(m.status));
	$: completedMatches = beefMatches.filter((m) => m.status === 'COMPLETED');
</script>

<svelte:head>
	<title>Beef Matches — MicroArena</title>
</svelte:head>

{#if !FEATURE_ENABLED}
	<ComingSoon
		title="Beef Matches"
		tagline="Settle rivalries with structure and integrity."
		description="Beef Matches enable direct clan challenges with clear rules, scheduling, and oversight (eventually)."
		planned={[
			'Challenge/accept flow (clan vs clan)',
			'Team formats (2v2 to 4v4)',
			'Referee and stream requirements (configurable per match)',
			'Result reporting and integrity impact for behavior (no-shows, disputes abuse)',
			'Future: winner-take-all / prestige formats once the platform is stable'
		]}
		actions={[
			{ label: 'Explore Clans', href: '/clans', kind: 'primary' },
			{ label: 'Learn Integrity', href: '/integrity', kind: 'secondary' },
			{ label: 'View Ladder', href: '/ladder', kind: 'secondary' }
		]}
	/>
{:else}
	<div class="container">
		<div class="page-header">
			<div class="header-content">
				<div>
					<h1>🥊 Beef Matches</h1>
					<p class="subtitle">Settle scores. Challenge rivals. Prove dominance.</p>
				</div>

				{#if $isAuthenticated && $currentUser?.clanId}
					<button on:click={() => (showCreateForm = !showCreateForm)}>
						{showCreateForm ? 'Cancel' : 'Start a Beef'}
					</button>
				{/if}
			</div>
		</div>

		{#if showCreateForm && $currentUser?.clanId}
			<div class="create-form card accent">
				<h3>Challenge a Clan</h3>

				{#if error}
					<div class="error-message">{error}</div>
				{/if}

				<form on:submit|preventDefault={createBeefMatch}>
					<div class="form-row">
						<div class="form-group">
							<label for="opponent">Opponent</label>
							<select id="opponent" bind:value={challengedClanId} required>
								<option value="">Select a clan...</option>
								{#each clans.filter((c) => c.id !== $currentUser?.clanId) as clan}
									<option value={clan.id}>{clan.tag} — {clan.name}</option>
								{/each}
							</select>
						</div>

						<div class="form-group format-group">
							<label for="format">Format</label>
							<select id="format" bind:value={format}>
								<option value="2v2">2v2</option>
								<option value="3v3">3v3</option>
								<option value="4v4">4v4</option>
							</select>
						</div>
					</div>

					<div class="form-group">
						<label for="ruleset">Rules & Game Mode</label>
						<textarea
							id="ruleset"
							bind:value={ruleset}
							rows="2"
							placeholder="e.g., Search & Destroy, Best of 5, CDL Rules"
							required
						></textarea>
					</div>

					<div class="form-row checkboxes">
						<label class="checkbox-label">
							<input type="checkbox" bind:checked={refRequired} />
							Referee Required
						</label>
						<label class="checkbox-label">
							<input type="checkbox" bind:checked={streamRequired} />
							Stream Required
						</label>
					</div>

					<button type="submit" disabled={creating}>
						{creating ? 'Sending...' : 'Send Challenge'}
					</button>
				</form>
			</div>
		{/if}

		{#if loading}
			<div class="loading"><div class="spinner"></div></div>
		{:else}
			<section class="matches-section">
				<h2>Active & Upcoming</h2>

				{#if activeMatches.length === 0}
					<div class="empty-state card">
						<p>No active beef matches. Start one!</p>
					</div>
				{:else}
					<div class="matches-grid">
						{#each activeMatches as beef}
							<div class="match-card card">
								<div class="match-header">
									<span class="status-badge {getStatusClass(beef.status)}">{beef.status}</span>
									<span class="match-format">{beef.format}</span>
								</div>

								<div class="match-teams">
									<div class="team">
										<span class="clan-tag">{beef.challengerClan?.tag || '???'}</span>
										<span class="clan-name">{beef.challengerClan?.name || ''}</span>
									</div>
									<span class="vs">VS</span>
									<div class="team">
										<span class="clan-tag">{beef.challengedClan?.tag || '???'}</span>
										<span class="clan-name">{beef.challengedClan?.name || ''}</span>
									</div>
								</div>

								<p class="ruleset">{beef.ruleset}</p>

								<div class="match-meta">
									{#if beef.refRequired}<span class="badge">REF</span>{/if}
									{#if beef.streamRequired}<span class="badge">STREAM</span>{/if}
								</div>

								{#if beef.status === 'PENDING' && $currentUser?.clanId === beef.challengedClanId}
									<div class="match-actions">
										<button class="sm" on:click={() => respondToBeef(beef.id, true)}>Accept</button>
										<button class="btn secondary sm" on:click={() => respondToBeef(beef.id, false)}
											>Decline</button
										>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="matches-section">
				<h2>Recent Results</h2>

				{#if completedMatches.length === 0}
					<div class="empty-state card">
						<p>No completed matches yet.</p>
					</div>
				{:else}
					<div class="matches-grid">
						{#each completedMatches as beef}
							<div class="match-card card completed">
								<div class="match-header">
									<span class="status-badge completed">Completed</span>
									<span class="match-format">{beef.format}</span>
								</div>

								<div class="match-teams">
									<div class="team" class:winner={beef.winnerId === beef.challengerClanId}>
										<span class="clan-tag">{beef.challengerClan?.tag || '???'}</span>
										{#if beef.winnerId === beef.challengerClanId}
											<span class="winner-badge">W</span>
										{/if}
									</div>
									<span class="vs">VS</span>
									<div class="team" class:winner={beef.winnerId === beef.challengedClanId}>
										<span class="clan-tag">{beef.challengedClan?.tag || '???'}</span>
										{#if beef.winnerId === beef.challengedClanId}
											<span class="winner-badge">W</span>
										{/if}
									</div>
								</div>

								{#if beef.challengerScore !== null}
									<p class="score">{beef.challengerScore} - {beef.challengedScore}</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<style>
		.page-header {
			margin: var(--space-xl) 0;
		}
		.header-content {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}
		.subtitle {
			color: var(--text-secondary);
			margin-top: var(--space-xs);
		}

		.create-form {
			margin-bottom: var(--space-xl);
		}
		.create-form h3 {
			margin-bottom: var(--space-lg);
		}
		.form-row {
			display: flex;
			gap: var(--space-md);
			margin-bottom: var(--space-md);
		}
		.form-group {
			flex: 1;
		}
		.form-group.format-group {
			flex: 0 0 120px;
		}
		.form-group label {
			display: block;
			font-weight: 500;
			margin-bottom: var(--space-xs);
			font-size: 0.875rem;
		}
		.checkboxes {
			margin-bottom: var(--space-lg);
		}
		.checkbox-label {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			cursor: pointer;
		}
		.checkbox-label input {
			width: auto;
		}

		.loading {
			display: flex;
			justify-content: center;
			padding: var(--space-3xl);
		}

		.matches-section {
			margin-bottom: var(--space-2xl);
		}
		.matches-section h2 {
			margin-bottom: var(--space-lg);
		}
		.matches-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
			gap: var(--space-md);
		}

		.match-card {
			padding: var(--space-lg);
		}
		.match-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: var(--space-md);
		}
		.match-format {
			font-family: var(--font-mono);
			font-weight: 700;
			color: var(--text-muted);
		}

		.match-teams {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-md);
			margin-bottom: var(--space-md);
		}
		.team {
			text-align: center;
		}
		.team .clan-tag {
			display: block;
			font-size: 1.25rem;
		}
		.team .clan-name {
			font-size: 0.75rem;
			color: var(--text-muted);
		}
		.team.winner .clan-tag {
			color: var(--success);
		}
		.vs {
			font-weight: 700;
			color: var(--text-muted);
		}
		.winner-badge {
			display: inline-block;
			background: var(--success);
			color: #000;
			font-size: 0.75rem;
			font-weight: 700;
			padding: 2px 6px;
			border-radius: var(--radius-sm);
			margin-top: var(--space-xs);
		}

		.ruleset {
			font-size: 0.875rem;
			color: var(--text-secondary);
			margin-bottom: var(--space-md);
		}
		.score {
			font-family: var(--font-mono);
			font-size: 1.25rem;
			font-weight: 700;
			text-align: center;
		}

		.match-meta {
			display: flex;
			gap: var(--space-xs);
			margin-bottom: var(--space-md);
		}
		.badge {
			font-size: 0.6875rem;
			font-weight: 600;
			padding: 2px 6px;
			background: var(--bg-tertiary);
			border-radius: var(--radius-sm);
			color: var(--text-muted);
		}

		.match-actions {
			display: flex;
			gap: var(--space-sm);
		}

		@media (max-width: 768px) {
			.form-row {
				flex-direction: column;
			}
			.matches-grid {
				grid-template-columns: 1fr;
			}
		}
	</style>
{/if}
