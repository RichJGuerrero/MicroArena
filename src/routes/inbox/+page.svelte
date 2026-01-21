<script lang="ts">
	import { onMount } from 'svelte';
	import { isAuthenticated, currentUser, isLoading, refreshUser } from '$lib/auth';
	import type { InboxItemView } from '$lib/types';

	let items: InboxItemView[] = [];
	let loading = true;
	let error = '';
	let actionLoading: string | null = null;

	const fmtTime = (t: number) => {
		try {
			return new Date(t).toLocaleString();
		} catch {
			return '';
		}
	};

	onMount(async () => {
		await load();
	});

	async function load() {
		error = '';
		if (!$isAuthenticated || !$currentUser) {
			loading = false;
			return;
		}

		loading = true;
		try {
			const res = await fetch(`/api/inbox?userId=${encodeURIComponent($currentUser.id)}`);
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Failed to load inbox';
				items = [];
				loading = false;
				return;
			}
			items = data.items || [];
		} catch (e) {
			error = 'Network error';
			items = [];
		}
		loading = false;
	}

	async function respond(item: InboxItemView, accept: boolean) {
		if (!$currentUser) return;
		actionLoading = item.id;
		error = '';
		try {
			const res = await fetch('/api/inbox/respond', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: $currentUser.id,
					type: item.type,
					id: item.id,
					accept
				})
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Failed to respond';
				actionLoading = null;
				return;
			}

			// If clan invite accepted, user state changes.
			await refreshUser();
			await load();
		} catch (e) {
			error = 'Network error';
		}
		actionLoading = null;
	}

	$: invites = items.filter((i) => i.type === 'CLAN_INVITE');
	$: challenges = items.filter((i) => i.type === 'MATCH_CHALLENGE');
</script>

<svelte:head>
	<title>Inbox — MicroArena</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<div>
			<h1>📥 Inbox</h1>
			<p class="subtitle">Pending clan invites and match challenges.</p>
		</div>
	</div>

	{#if $isLoading}
		<div class="loading"><div class="spinner"></div></div>
	{:else if !$isAuthenticated || !$currentUser}
		<div class="empty-state card">
			<div class="empty-state-icon">🔒</div>
			<p>You need to be logged in to view your inbox.</p>
			<a href="/login" class="btn">Login</a>
		</div>
	{:else if loading}
		<div class="loading"><div class="spinner"></div></div>
	{:else}
		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		{#if items.length === 0}
			<div class="empty-state card">
				<div class="empty-state-icon">✅</div>
				<p>No pending items.</p>
				<p class="muted">When someone invites you to a clan or challenges you, it will show up here.</p>
			</div>
		{:else}
			{#if invites.length > 0}
				<div class="section">
					<h2>Clan Invites</h2>
					<div class="list">
						{#each invites as item (item.id)}
							<div class="item card">
								<div class="item-main">
									<div class="title-row">
										<div class="title">{item.title}</div>
										{#if item.href}
											<a class="link" href={item.href}>View</a>
										{/if}
									</div>
									<div class="details">{item.details}</div>
									<div class="meta">{fmtTime(item.createdAt)}</div>
								</div>

								<div class="actions">
									<button class="btn" disabled={actionLoading === item.id} on:click={() => respond(item, true)}>
										{actionLoading === item.id ? '...' : 'Accept'}
									</button>
									<button class="btn secondary" disabled={actionLoading === item.id} on:click={() => respond(item, false)}>
										Decline
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if challenges.length > 0}
				<div class="section">
					<h2>Match Challenges</h2>
					<div class="list">
						{#each challenges as item (item.id)}
							<div class="item card">
								<div class="item-main">
									<div class="title-row">
										<div class="title">{item.title}</div>
										{#if item.href}
											<a class="link" href={item.href}>Go</a>
										{/if}
									</div>
									<div class="details">{item.details}</div>
									<div class="meta">{fmtTime(item.createdAt)}</div>
								</div>

								<div class="actions">
									<button class="btn" disabled={actionLoading === item.id} on:click={() => respond(item, true)}>
										{actionLoading === item.id ? '...' : 'Accept'}
									</button>
									<button class="btn secondary" disabled={actionLoading === item.id} on:click={() => respond(item, false)}>
										Decline
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.page-header { margin: var(--space-xl) 0; }
	.subtitle { color: var(--text-secondary); margin-top: var(--space-xs); }

	.section { margin-top: var(--space-xl); }
	.section h2 { font-size: 1.15rem; margin-bottom: var(--space-md); }

	.list { display: grid; gap: var(--space-md); }

	.item {
		display: flex;
		justify-content: space-between;
		gap: var(--space-lg);
		align-items: center;
	}

	.item-main { flex: 1; min-width: 0; }

	.title-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.title { font-weight: 700; color: var(--text-primary); }
	.details { color: var(--text-secondary); margin-top: var(--space-xs); }
	.meta { color: var(--text-muted); font-size: 0.8rem; margin-top: var(--space-xs); }

	.actions { display: flex; gap: var(--space-sm); }
	.link { color: var(--accent); font-weight: 600; }
	.link:hover { text-decoration: underline; }

	.empty-state {
		text-align: center;
		padding: var(--space-2xl);
	}
	.empty-state-icon { font-size: 2.25rem; margin-bottom: var(--space-md); }
	.muted { color: var(--text-muted); margin-top: var(--space-xs); }
</style>
