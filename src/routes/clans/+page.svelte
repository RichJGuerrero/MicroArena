<script lang="ts">
	import { onMount } from 'svelte';
	import { isAuthenticated, currentUser, refreshUser } from '$lib/auth';
	import { getIntegrityLevel } from '$lib/types';
	import type { Clan } from '$lib/types';
	
	let clans: Clan[] = [];
	let loading = true;
	let showCreateForm = false;
	let creating = false;
	let error = '';
	
	let clanTag = '';
	let clanName = '';
	let clanDescription = '';
	
	onMount(async () => {
		await loadClans();
	});
	
	async function loadClans() {
		loading = true;
		try {
			const res = await fetch('/api/clans');
			if (res.ok) {
				const data = await res.json();
				clans = data.clans;
			}
		} catch (e) {
			console.error('Failed to load clans:', e);
		}
		loading = false;
	}
	
	async function handleCreateClan() {
		if (!$currentUser) return;
		error = '';
		
		if (!clanTag.trim() || !clanName.trim()) {
			error = 'Tag and name are required';
			return;
		}
		
		creating = true;
		try {
			const res = await fetch('/api/clans', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tag: clanTag.trim(),
					name: clanName.trim(),
					description: clanDescription.trim(),
					founderId: $currentUser.id
				})
			});
			
			const data = await res.json();
			
			if (!res.ok) {
				error = data.error || 'Failed to create clan';
				creating = false;
				return;
			}
			
			// Refresh user and clans
			await refreshUser();
			await loadClans();
			
			showCreateForm = false;
			clanTag = '';
			clanName = '';
			clanDescription = '';
		} catch (e) {
			error = 'Network error';
		}
		creating = false;
	}
</script>

<svelte:head>
	<title>Clans — MicroArena</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<div class="header-content">
			<div>
				<h1>👥 Clans</h1>
				<p class="subtitle">Find your team. Build your legacy.</p>
			</div>
			
			{#if $isAuthenticated && $currentUser && !$currentUser.clanId}
				<button on:click={() => showCreateForm = !showCreateForm}>
					{showCreateForm ? 'Cancel' : 'Create Clan'}
				</button>
			{/if}
		</div>
	</div>
	
	{#if showCreateForm}
		<div class="create-form card accent">
			<h3>Create a New Clan</h3>
			
			{#if error}
				<div class="error-message">{error}</div>
			{/if}
			
			<form on:submit|preventDefault={handleCreateClan}>
				<div class="form-row">
					<div class="form-group tag-group">
						<label for="clanTag">Tag</label>
						<input
							type="text"
							id="clanTag"
							bind:value={clanTag}
							placeholder="APEX"
							maxlength="6"
							disabled={creating}
						/>
						<p class="hint">2-6 characters</p>
					</div>
					
					<div class="form-group">
						<label for="clanName">Name</label>
						<input
							type="text"
							id="clanName"
							bind:value={clanName}
							placeholder="Apex Predators"
							maxlength="32"
							disabled={creating}
						/>
					</div>
				</div>
				
				<div class="form-group">
					<label for="clanDesc">Description (optional)</label>
					<textarea
						id="clanDesc"
						bind:value={clanDescription}
						placeholder="Tell others about your clan..."
						rows="3"
						disabled={creating}
					></textarea>
				</div>
				
				<button type="submit" disabled={creating}>
					{creating ? 'Creating...' : 'Create Clan'}
				</button>
			</form>
		</div>
	{/if}
	
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
		</div>
	{:else if clans.length === 0}
		<div class="empty-state card">
			<div class="empty-state-icon">👥</div>
			<p>No clans yet. Be the first to create one!</p>
		</div>
	{:else}
		<div class="clans-grid">
			{#each clans as clan}
				<a href="/clans/{clan.tag}" class="clan-card card interactive">
					<div class="clan-header">
						<span class="clan-tag-large">{clan.tag}</span>
						<span class="integrity-badge {getIntegrityLevel(clan.integrity)}">
							{clan.integrity}
						</span>
					</div>
					
					<h3 class="clan-name">{clan.name}</h3>
					
					{#if clan.description}
						<p class="clan-desc">{clan.description}</p>
					{/if}
					
					<div class="clan-meta">
						<span>{clan.memberCount} member{clan.memberCount !== 1 ? 's' : ''}</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-header { margin: var(--space-xl) 0; }
	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.subtitle { color: var(--text-secondary); margin-top: var(--space-xs); }
	
	.create-form { margin-bottom: var(--space-xl); }
	.create-form h3 { margin-bottom: var(--space-lg); }
	
	.form-row {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}
	.form-group { flex: 1; margin-bottom: var(--space-md); }
	.form-group.tag-group { flex: 0 0 120px; }
	.form-group label {
		display: block;
		font-weight: 500;
		margin-bottom: var(--space-xs);
		font-size: 0.875rem;
	}
	.hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-top: var(--space-xs);
	}
	
	.loading {
		display: flex;
		justify-content: center;
		padding: var(--space-3xl);
	}
	
	.clans-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-md);
	}
	
	.clan-card {
		padding: var(--space-lg);
		display: block;
	}
	
	.clan-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-md);
	}
	
	.clan-tag-large {
		font-family: var(--font-mono);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--accent);
	}
	
	.clan-name {
		color: var(--text-primary);
		margin-bottom: var(--space-sm);
	}
	
	.clan-desc {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-bottom: var(--space-md);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.clan-meta {
		font-size: 0.875rem;
		color: var(--text-muted);
	}
	
	@media (max-width: 600px) {
		.form-row { flex-direction: column; }
		.form-group.tag-group { flex: 1; }
	}
</style>
