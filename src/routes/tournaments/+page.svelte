<script lang="ts">
	import { onMount } from 'svelte';
	import { isAuthenticated, currentUser } from '$lib/auth';
	import { canAccessTier } from '$lib/types';
	import type { Tournament, Clan } from '$lib/types';
	import ComingSoon from '$lib/components/ComingSoon.svelte';

	// POLISH PHASE: Feature is staged but intentionally inactive.
	// Flip to true when Tournaments are ready to go live.
	const FEATURE_ENABLED = false;

	let tournaments: (Tournament & { registeredCount: number })[] = [];
	let userClan: Clan | null = null;
	let loading = true;

	onMount(async () => {
		if (!FEATURE_ENABLED) {
			loading = false;
			return;
		}

		await loadTournaments();
		if ($currentUser?.clanId) {
			await loadUserClan();
		}
	});

	async function loadTournaments() {
		try {
			const res = await fetch('/api/tournaments');
			if (res.ok) {
				const data = await res.json();
				tournaments = data.tournaments;
			}
		} catch (e) {
			console.error(e);
		}
		loading = false;
	}

	async function loadUserClan() {
		if (!$currentUser?.clanId) return;
		try {
			const res = await fetch(`/api/clans/${$currentUser.clanId}`);
			if (res.ok) {
				const data = await res.json();
				userClan = data.clan;
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function registerForTournament(tournamentId: string) {
		if (!$currentUser?.clanId) return;

		try {
			const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clanId: $currentUser.clanId,
					userId: $currentUser.id
				})
			});

			if (res.ok) {
				await loadTournaments();
			} else {
				const data = await res.json();
				alert(data.error || 'Registration failed');
			}
		} catch (e) {
			alert('Network error');
		}
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getTierClass(tier: string): string {
		return tier.toLowerCase();
	}

	function getStatusClass(status: string): string {
		switch (status) {
			case 'LIVE':
				return 'live';
			case 'REGISTRATION_OPEN':
				return 'upcoming';
			case 'COMPLETED':
				return 'completed';
			default:
				return 'pending';
		}
	}

	function canRegister(t: Tournament): boolean {
		if (!$isAuthenticated || !$currentUser?.clanId || !userClan) return false;
		if (t.status !== 'REGISTRATION_OPEN') return false;
		return canAccessTier(userClan.integrity, t.tier);
	}
</script>

<svelte:head>
	<title>Tournaments — MicroArena</title>
</svelte:head>

{#if !FEATURE_ENABLED}
	<ComingSoon
		title="Tournaments"
		tagline="Curated competition with real oversight."
		description="Tournaments will deliver scheduled brackets, integrity-gated tiers, and referee oversight (eventually, for showcase tournaments). The goal is high-signal competition without queue abuse, stalling, or dispute chaos. XP only. Paid prizes to come"
		planned={[
			'Showcase-style scheduled brackets (one match at a time with limited teams to prevent time torching. Dedicated real time referee oversight.)',
			'Integrity tiers: Open / Premier / Showcase',
			'Live referee presence and clear dispute workflow for showcase tournaments',
			'Seasonal ladder alignment + prestige rewards (OG animated emblem concept)',
			'Anti-abuse guardrails to prevent multi-queue exploitation'
		]}
		actions={[
			{ label: 'Learn Integrity', href: '/integrity', kind: 'primary' },
			{ label: 'View Ladder', href: '/ladder', kind: 'secondary' },
			{ label: 'Explore Clans', href: '/clans', kind: 'secondary' }
		]}
	/>
{:else}
	<div class="container">
		<div class="page-header">
			<h1>🏆 Tournaments</h1>
			<p class="subtitle">Compete for glory. Integrity determines access.</p>
		</div>

		<div class="tier-legend card">
			<div class="tier-item">
				<span class="tier-badge showcase">SHOWCASE</span>
				<span>100% Integrity — Elite</span>
			</div>
			<div class="tier-item">
				<span class="tier-badge premier">PREMIER</span>
				<span>90%+ Integrity</span>
			</div>
			<div class="tier-item">
				<span class="tier-badge open">OPEN</span>
				<span>50%+ Integrity</span>
			</div>
		</div>

		{#if loading}
			<div class="loading"><div class="spinner"></div></div>
		{:else if tournaments.length === 0}
			<div class="empty-state card">
				<p>No tournaments scheduled yet. Check back soon!</p>
			</div>
		{:else}
			<div class="tournaments-grid">
				{#each tournaments as t}
					<div class="tournament-card card" class:showcase={t.tier === 'SHOWCASE'}>
						<div class="tournament-header">
							<span class="tier-badge {getTierClass(t.tier)}">{t.tier}</span>
							<span class="status-badge {getStatusClass(t.status)}">{t.status.replace('_', ' ')}</span>
						</div>

						<h3>{t.name}</h3>
						<p class="tournament-desc">{t.description}</p>

						<div class="tournament-meta">
							<div class="meta-row">
								<span class="meta-label">Game:</span>
								<span class="meta-value">{t.game}</span>
							</div>
							<div class="meta-row">
								<span class="meta-label">Format:</span>
								<span class="meta-value">{t.format}</span>
							</div>
							<div class="meta-row">
								<span class="meta-label">Teams:</span>
								<span class="meta-value">{t.registeredCount}/{t.maxTeams}</span>
							</div>
							<div class="meta-row">
								<span class="meta-label">Min Integrity:</span>
								<span class="meta-value text-accent">{t.integrityRequirement}%</span>
							</div>
						</div>

						<div class="tournament-info">
							<p>📅 {formatDate(t.startTime)}</p>
							{#if t.prizeDescription}
								<p>💰 {t.prizeDescription}</p>
							{/if}
						</div>

						<div class="tournament-actions">
							{#if t.status === 'REGISTRATION_OPEN'}
								{#if canRegister(t)}
									<button class="sm" on:click={() => registerForTournament(t.id)}>Register</button>
								{:else if !$isAuthenticated}
									<a href="/login" class="btn secondary sm">Login to Register</a>
								{:else if !$currentUser?.clanId}
									<span class="action-note">Join a clan first</span>
								{:else}
									<span class="action-note">Integrity not met</span>
								{/if}
							{:else if t.status === 'LIVE'}
								<span class="live-indicator">🔴 Live Now</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<style>
		.page-header {
			margin: var(--space-xl) 0;
		}
		.subtitle {
			color: var(--text-secondary);
			margin-top: var(--space-xs);
		}

		.tier-legend {
			display: flex;
			gap: var(--space-xl);
			margin-bottom: var(--space-xl);
			padding: var(--space-md) var(--space-lg);
		}
		.tier-item {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			font-size: 0.875rem;
			color: var(--text-muted);
		}

		.loading {
			display: flex;
			justify-content: center;
			padding: var(--space-3xl);
		}

		.tournaments-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
			gap: var(--space-lg);
		}

		.tournament-card {
			padding: var(--space-lg);
		}
		.tournament-card.showcase {
			border-color: rgba(251, 191, 36, 0.3);
			background: linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, transparent 50%);
		}

		.tournament-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: var(--space-md);
		}

		.tournament-card h3 {
			margin-bottom: var(--space-sm);
			font-size: 1.25rem;
		}
		.tournament-desc {
			font-size: 0.875rem;
			color: var(--text-secondary);
			margin-bottom: var(--space-md);
		}

		.tournament-meta {
			margin-bottom: var(--space-md);
		}
		.meta-row {
			display: flex;
			justify-content: space-between;
			font-size: 0.875rem;
			padding: var(--space-xs) 0;
		}
		.meta-label {
			color: var(--text-muted);
		}
		.meta-value {
			font-weight: 600;
		}

		.tournament-info {
			font-size: 0.875rem;
			color: var(--text-secondary);
			margin-bottom: var(--space-md);
		}
		.tournament-info p {
			margin-bottom: var(--space-xs);
		}

		.tournament-actions {
			padding-top: var(--space-md);
			border-top: 1px solid var(--border);
		}
		.action-note {
			font-size: 0.8125rem;
			color: var(--text-muted);
		}
		.live-indicator {
			color: var(--error);
			font-weight: 600;
		}

		@media (max-width: 768px) {
			.tier-legend {
				flex-direction: column;
				gap: var(--space-sm);
			}
			.tournaments-grid {
				grid-template-columns: 1fr;
			}
		}
	</style>
{/if}
