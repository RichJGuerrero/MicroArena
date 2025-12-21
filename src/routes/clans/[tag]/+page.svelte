<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated, currentUser, refreshUser } from '$lib/auth';
	import { getIntegrityLevel } from '$lib/types';
	import type { ClanWithMembers, BeefMatch } from '$lib/types';
	
	let clan: ClanWithMembers | null = null;
	let beefMatches: BeefMatch[] = [];
	let loading = true;
	let actionLoading = false;
	let error = '';
	
	$: tag = $page.params.tag;
	$: isInThisClan = $currentUser?.clanId === clan?.id;
	$: isFounder = $currentUser?.id === clan?.founderId;
	$: canJoin = $isAuthenticated && $currentUser && !$currentUser.clanId;
	
	onMount(() => loadClan());
	
	async function loadClan() {
		loading = true;
		try {
			const res = await fetch(`/api/clans/${tag}`);
			if (!res.ok) {
				if (res.status === 404) {
					goto('/clans');
					return;
				}
				throw new Error('Failed to load clan');
			}
			const data = await res.json();
			clan = data.clan;
			beefMatches = data.beefMatches || [];
		} catch (e) {
			console.error(e);
			error = 'Failed to load clan';
		}
		loading = false;
	}
	
	async function handleJoin() {
		if (!$currentUser || !clan) return;
		error = '';
		actionLoading = true;
		
		try {
			const res = await fetch(`/api/clans/${clan.id}/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: $currentUser.id })
			});
			
			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to join';
				actionLoading = false;
				return;
			}
			
			await refreshUser();
			await loadClan();
		} catch (e) {
			error = 'Network error';
		}
		actionLoading = false;
	}
	
	async function handleLeave() {
		if (!$currentUser || !clan) return;
		
		const msg = isFounder && clan.members.length > 1
			? 'As founder, leaving transfers ownership. Continue?'
			: isFounder
			? 'As the only member, leaving disbands the clan. Continue?'
			: 'Are you sure you want to leave?';
		
		if (!confirm(msg)) return;
		
		error = '';
		actionLoading = true;
		
		try {
			const res = await fetch(`/api/clans/${clan.id}/leave`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: $currentUser.id })
			});
			
			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to leave';
				actionLoading = false;
				return;
			}
			
			const data = await res.json();
			await refreshUser();
			
			if (data.disbanded) {
				goto('/clans');
			} else {
				await loadClan();
			}
		} catch (e) {
			error = 'Network error';
		}
		actionLoading = false;
	}
</script>

<svelte:head>
	<title>{clan ? `[${clan.tag}] ${clan.name}` : 'Clan'} — MicroArena</title>
</svelte:head>

<div class="container narrow">
	{#if loading}
		<div class="loading"><div class="spinner"></div></div>
	{:else if clan}
		<div class="clan-page">
			<header class="clan-header card">
				<div class="header-content">
					<div class="clan-identity">
						<span class="clan-tag-large">{clan.tag}</span>
						<div>
							<h1>{clan.name}</h1>
							<p class="text-muted">
								Founded {new Date(clan.createdAt).toLocaleDateString()}
							</p>
						</div>
					</div>
					
					<div class="clan-stats">
						<div class="stat">
							<span class="stat-value {getIntegrityLevel(clan.integrity)}">{clan.integrity}</span>
							<span class="stat-label">Integrity</span>
						</div>
						<div class="stat">
							<span class="stat-value">{clan.memberCount}</span>
							<span class="stat-label">Members</span>
						</div>
					</div>
				</div>
				
				{#if clan.description}
					<p class="clan-description">{clan.description}</p>
				{/if}
				
				<div class="clan-actions">
					{#if canJoin}
						<button on:click={handleJoin} disabled={actionLoading}>
							{actionLoading ? 'Joining...' : 'Join Clan'}
						</button>
					{:else if isInThisClan}
						<button class="btn danger" on:click={handleLeave} disabled={actionLoading}>
							{actionLoading ? 'Leaving...' : 'Leave Clan'}
						</button>
					{:else if !$isAuthenticated}
						<a href="/login" class="btn">Login to Join</a>
					{:else if $currentUser?.clanId}
						<p class="text-muted">You're already in a clan</p>
					{/if}
				</div>
				
				{#if error}
					<div class="error-message mt-md">{error}</div>
				{/if}
			</header>
			
			<section class="members-section">
				<h2>Members ({clan.members.length})</h2>
				
				<div class="members-list">
					{#each clan.members as member}
						<div class="member-card card">
							<div class="member-info">
								<div class="avatar sm">{member.username.charAt(0)}</div>
								<div>
									<span class="member-name">{member.username}</span>
									{#if member.isFounder}
										<span class="founder-badge">★ Founder</span>
									{/if}
								</div>
							</div>
							<span class="integrity-badge {getIntegrityLevel(member.integrity)}">
								{member.integrity}
							</span>
						</div>
					{/each}
				</div>
			</section>
			
			{#if beefMatches.length > 0}
				<section class="beef-section">
					<h2>Recent Beef Matches</h2>
					<div class="beef-list">
						{#each beefMatches.slice(0, 5) as beef}
							<a href="/beef" class="beef-card card">
								<div class="beef-teams">
									<span class="clan-tag">{beef.challengerClan?.tag || beef.challengerClanId}</span>
									<span class="vs">vs</span>
									<span class="clan-tag">{beef.challengedClan?.tag || beef.challengedClanId}</span>
								</div>
								<span class="status-badge {beef.status.toLowerCase()}">{beef.status}</span>
							</a>
						{/each}
					</div>
				</section>
			{/if}
			
			<a href="/clans" class="back-link">← Back to Clans</a>
		</div>
	{:else}
		<div class="error-state">
			<h2>Clan not found</h2>
			<a href="/clans" class="btn">Browse Clans</a>
		</div>
	{/if}
</div>

<style>
	.loading, .error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-3xl);
		gap: var(--space-lg);
	}
	
	.clan-page {
		padding: var(--space-xl) 0;
	}
	
	.clan-header { margin-bottom: var(--space-xl); }
	
	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
	}
	
	.clan-identity {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
	}
	
	.clan-tag-large {
		font-family: var(--font-mono);
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--accent);
	}
	
	.clan-identity h1 { margin-bottom: var(--space-xs); }
	
	.clan-stats {
		display: flex;
		gap: var(--space-xl);
	}
	
	.stat { text-align: center; }
	.stat-value {
		font-family: var(--font-mono);
		font-size: 1.5rem;
		font-weight: 700;
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
	
	.clan-description {
		color: var(--text-secondary);
		margin-bottom: var(--space-lg);
	}
	
	.members-section, .beef-section { margin-bottom: var(--space-xl); }
	.members-section h2, .beef-section h2 { margin-bottom: var(--space-lg); }
	
	.members-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: var(--space-md);
	}
	
	.member-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
	}
	
	.member-info {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	
	.member-name {
		font-weight: 500;
		margin-right: var(--space-sm);
	}
	
	.beef-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}
	
	.beef-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
	}
	
	.beef-teams {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	
	.vs {
		color: var(--text-muted);
		font-weight: 500;
	}
	
	.back-link {
		display: inline-block;
		margin-top: var(--space-lg);
	}
	
	@media (max-width: 640px) {
		.header-content { flex-direction: column; }
		.clan-identity { flex-direction: column; text-align: center; }
		.clan-stats { width: 100%; justify-content: center; }
	}
</style>
