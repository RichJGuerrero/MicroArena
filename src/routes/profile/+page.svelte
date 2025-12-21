<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { isAuthenticated, currentUser, refreshUser } from '$lib/auth';
	import { getIntegrityLevel, getIntegrityLabel } from '$lib/types';
	import type { Clan, UserStats } from '$lib/types';
	
	let clan: Clan | null = null;
	let stats: UserStats | null = null;
	let isFounder = false;
	let loading = true;
	
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
			
			{#if stats}
				<section class="profile-section card">
					<h2>Stats</h2>
					<div class="stats-grid">
						<div class="stat">
							<span class="stat-value">{stats.totalMatches}</span>
							<span class="stat-label">Matches</span>
						</div>
						<div class="stat">
							<span class="stat-value">{stats.wins}</span>
							<span class="stat-label">Wins</span>
						</div>
						<div class="stat">
							<span class="stat-value">{stats.losses}</span>
							<span class="stat-label">Losses</span>
						</div>
						<div class="stat">
							<span class="stat-value">{stats.winRate}%</span>
							<span class="stat-label">Win Rate</span>
						</div>
					</div>
				</section>
			{/if}
			
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
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-lg);
	}
	
	.stat {
		text-align: center;
	}
	
	.stat-value {
		font-family: var(--font-mono);
		font-size: 1.5rem;
		font-weight: 700;
		display: block;
	}
	
	.stat-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
	}
	
	.cta-section { text-align: center; }
	.cta-section p { margin-bottom: var(--space-lg); }
	
	@media (max-width: 640px) {
		.profile-identity { flex-direction: column; text-align: center; }
		.stats-grid { grid-template-columns: repeat(2, 1fr); }
	}
</style>
