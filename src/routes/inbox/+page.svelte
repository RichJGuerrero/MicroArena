<script lang="ts">
	import { onMount } from 'svelte';
	import { isAuthenticated, currentUser, refreshUser } from '$lib/auth';
	import { goto } from '$app/navigation';
	import type { ClanInvite } from '$lib/types';

	let loading = true;
	let error = '';
	let invites: ClanInvite[] = [];
	let actionLoading = new Set<string>();

	$: pendingInvites = invites.filter(i => i.status === 'PENDING');

	onMount(async () => {
		if (!$isAuthenticated) {
			goto('/login');
			return;
		}
		await loadInvites();
	});

	async function loadInvites() {
		if (!$currentUser) return;
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/invites?userId=${encodeURIComponent($currentUser.id)}`);
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to load invites');
			}
			const data = await res.json();
			invites = data.invites || [];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load invites';
		} finally {
			loading = false;
		}
	}

	async function respond(inviteId: string, action: 'ACCEPT' | 'DECLINE') {
		if (!$currentUser) return;
		error = '';
		actionLoading.add(inviteId);
		actionLoading = new Set(actionLoading);

		try {
			const res = await fetch(`/api/invites/${inviteId}/respond`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: $currentUser.id, action })
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to respond');
			}

			// Accepting changes clan membership; refresh auth user + reload invites
			await refreshUser();
			await loadInvites();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Network error';
		} finally {
			actionLoading.delete(inviteId);
			actionLoading = new Set(actionLoading);
		}
	}

	function timeLeft(inv: ClanInvite): string {
		if (inv.status !== 'PENDING') return '';
		const ms = inv.expiresAt - Date.now();
		if (ms <= 0) return 'Expired';
		const hours = Math.floor(ms / (1000 * 60 * 60));
		const days = Math.floor(hours / 24);
		if (days >= 1) return `${days}d left`;
		return `${Math.max(1, hours)}h left`;
	}
</script>

<svelte:head>
	<title>Inbox — MicroArena</title>
</svelte:head>

<div class="container narrow">
	<div class="page-header">
		<h1>Inbox</h1>
		<p class="text-muted">Clan invites land here. Accepting one auto-cancels the rest.</p>
	</div>

	{#if loading}
		<div class="loading"><div class="spinner"></div></div>
	{:else}
		{#if error}
			<div class="error-message mb-md">{error}</div>
		{/if}

		{#if pendingInvites.length === 0}
			<div class="card">
				<h2>No invites</h2>
				<p class="text-muted">You’re clear. When a clan founder invites you, it’ll show up here.</p>
			</div>
		{:else}
			<div class="invite-list">
				{#each pendingInvites as inv (inv.id)}
					<div class="card invite-card">
						<div class="invite-top">
							<div class="invite-clan">
								<span class="tag badge">{inv.clanTag}</span>
								<div>
									<div class="invite-title">{inv.clanName}</div>
									<div class="text-muted small">Invited by <strong>{inv.inviterUsername}</strong> • {timeLeft(inv)}</div>
								</div>
							</div>

							<div class="invite-actions">
								<button
									class="btn"
									disabled={actionLoading.has(inv.id)}
									on:click={() => respond(inv.id, 'ACCEPT')}
								>
									{actionLoading.has(inv.id) ? 'Working…' : 'Accept'}
								</button>
								<button
									class="btn secondary"
									disabled={actionLoading.has(inv.id)}
									on:click={() => respond(inv.id, 'DECLINE')}
								>
									Decline
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.page-header {
		margin-bottom: var(--space-lg);
	}
	.invite-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
	.invite-card {
		padding: var(--space-lg);
	}
	.invite-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		flex-wrap: wrap;
	}
	.invite-clan {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}
	.invite-title {
		font-weight: 800;
		font-size: 1.05rem;
	}
	.small { font-size: 0.875rem; }
	.invite-actions {
		display: flex;
		gap: var(--space-sm);
	}
</style>
