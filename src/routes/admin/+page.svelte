<script lang="ts">
	import { onMount } from 'svelte';
	import type { ArenaMatchView, ArenaSideKey, IntegrityEventType } from '$lib/types';

	let isAdmin = false;
	let loading = true;
	let error: string | null = null;

	let key = '';
	let loggingIn = false;

	let disputes: ArenaMatchView[] = [];
	let selectedId: string | null = null;
	let actionBusy: string | null = null;

	// Resolve form
	let winnerSide: ArenaSideKey = 'A';
	let scoreA: number | '' = '';
	let scoreB: number | '' = '';
	let resolutionNote = '';

	// Integrity form
	let integrityUserId = '';
	let integrityType: IntegrityEventType = 'TOXICITY';
	let integritySeverity: number = 2;
	let integrityDescription = '';

	const integrityTypes: IntegrityEventType[] = [
		'STALLING',
		'NO_SHOW',
		'CHEATING',
		'TOXICITY',
		'DISPUTE_ABUSE',
		'UNSPORTSMANLIKE',
		'MATCH_MANIPULATION',
		'RESTORED'
	];

	function selected(): ArenaMatchView | null {
		return disputes.find((d) => d.match.id === selectedId) ?? null;
	}

		function selectedRequired(): ArenaMatchView {
			const v = selected();
			if (!v) throw new Error("No match selected");
			return v;
		}


	async function refreshAdminState() {
		try {
			const res = await fetch('/api/admin/me');
			const data = await res.json();
			isAdmin = Boolean(data?.isAdmin);
		} catch {
			isAdmin = false;
		}
	}

	async function loadDisputes() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/admin/disputes');
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to load disputes');
			disputes = data?.data ?? [];
			if (disputes.length && !selectedId) {
				selectedId = disputes[0].match.id;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load disputes';
			disputes = [];
			selectedId = null;
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await refreshAdminState();
		if (isAdmin) await loadDisputes();
		loading = false;
	});

	async function loginAdmin() {
		error = null;
		loggingIn = true;
		try {
			const res = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ key })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Login failed');
			key = '';
			await refreshAdminState();
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new Event('microarena:admin-changed'));
			}
			await loadDisputes();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Login failed';
		} finally {
			loggingIn = false;
		}
	}

	async function logoutAdmin() {
		error = null;
		actionBusy = 'logout';
		try {
			await fetch('/api/admin/logout', { method: 'POST' });
			isAdmin = false;
			disputes = [];
			selectedId = null;
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new Event('microarena:admin-changed'));
			}
		} finally {
			actionBusy = null;
		}
	}

	function formatLabel(f: string) {
		return f.toUpperCase();
	}

	function whoLabel(v: ArenaMatchView, side: 'A' | 'B') {
		if (v.match.scope === 'CLAN') {
			const clan = side === 'A' ? v.teamAClan : v.teamBClan;
			return clan ? `[${clan.tag}] ${clan.name}` : side === 'A' ? 'Team A' : 'Team B';
		}
		const players = side === 'A' ? v.teamAPlayers : v.teamBPlayers;
		return players.map((p) => p.username).join(', ') || (side === 'A' ? 'Team A' : 'Team B');
	}

	function allParticipants(v: ArenaMatchView) {
		return [...v.teamAPlayers.map((p) => ({ ...p, side: 'A' as const })), ...v.teamBPlayers.map((p) => ({ ...p, side: 'B' as const }))];
	}

	async function resolveSelected() {
		const v = selected();
		if (!v) return;
		error = null;
		actionBusy = `resolve:${v.match.id}`;
		try {
			const res = await fetch(`/api/admin/matches/${v.match.id}/resolve`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					winnerSide,
					scoreA: scoreA === '' ? undefined : Number(scoreA),
					scoreB: scoreB === '' ? undefined : Number(scoreB),
					resolutionNote
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to resolve');
			// Reset some UI state
			resolutionNote = '';
			scoreA = '';
			scoreB = '';
			await loadDisputes();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to resolve';
		} finally {
			actionBusy = null;
		}
	}

	async function applyIntegrity() {
		const v = selected();
		if (!v) return;
		error = null;
		actionBusy = `integrity:${integrityUserId}`;
		try {
			const res = await fetch('/api/admin/integrity', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					targetUserId: integrityUserId,
					type: integrityType,
					severity: integritySeverity,
					description: integrityDescription,
					matchId: v.match.id
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to apply integrity');
			integrityDescription = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to apply integrity';
		} finally {
			actionBusy = null;
		}
	}
</script>

<div class="container">
	<div class="page-header">
		<h1>Admin / Ref Panel</h1>
		<p class="text-secondary">Resolve disputed matches and apply integrity actions. (V0 override tooling)</p>
	</div>

	{#if error}
		<div class="card muted">
			<strong class="text-accent">Error:</strong>
			<div class="mt-sm">{error}</div>
		</div>
	{/if}

	{#if !isAdmin}
		<div class="card">
			<h2>Admin Access</h2>
			<p class="text-secondary">Enter the admin key to unlock override tools.</p>
			<div class="mt-md" style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
				<input
					class="input"
					type="password"
					placeholder="Admin key"
					bind:value={key}
					style="min-width:240px;"
				/>
				<button class="btn" disabled={loggingIn || !key} on:click={loginAdmin}>
					{loggingIn ? 'Unlocking…' : 'Unlock'}
				</button>
			</div>
			<p class="text-muted mt-md">Local dev default: <code>dev</code>. Production: set <code>ADMIN_KEY</code> in environment.</p>
		</div>
	{:else}
		<div class="card muted" style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
			<div>
				<strong>Admin session active</strong>
				<div class="text-muted">You can now resolve disputes and issue integrity actions.</div>
			</div>
			<button class="btn ghost sm" disabled={actionBusy==='logout'} on:click={logoutAdmin}>
				{actionBusy==='logout' ? 'Logging out…' : 'Logout'}
			</button>
		</div>

		<div class="grid" style="grid-template-columns: 1.1fr 1.4fr; gap: var(--space-lg); align-items:start;">
			<div class="card">
				<div class="card-header">
					<h2>Disputed Matches</h2>
					<p class="text-secondary">These need a ref decision.</p>
				</div>

				{#if loading}
					<div class="text-muted">Loading…</div>
				{:else if disputes.length === 0}
					<div class="text-muted">No disputes right now. (Peace… suspiciously peaceful.)</div>
				{:else}
					<div class="flow tight">
						{#each disputes as d}
							<button
								class="card muted"
								style="text-align:left; width:100%;"
								on:click={() => (selectedId = d.match.id)}
							>
								<div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
									<strong>{formatLabel(d.match.format)} {d.match.scope} · {d.match.queue}</strong>
									<span class="pill warn">DISPUTED</span>
								</div>
								<div class="text-muted mt-xs">{whoLabel(d, 'A')} vs {whoLabel(d, 'B')}</div>
								{#if d.match.disputeReason}
									<div class="mt-sm" style="font-size:0.9rem;">{d.match.disputeReason}</div>
								{/if}
								<div class="text-muted mt-sm" style="font-size:0.85rem;">
									Evidence: {d.match.evidence?.length ?? 0}
									{#if selectedId === d.match.id} · <span class="text-accent">Selected</span>{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="card">
				{#if !selected()}
					<h2>Match Details</h2>
					<div class="text-muted">Select a disputed match to review evidence and resolve.</div>
				{:else}
					{@const v = selectedRequired()}
					<div class="card-header">
						<h2>Match Details</h2>
						<p class="text-secondary">{whoLabel(v, 'A')} vs {whoLabel(v, 'B')}</p>
					</div>

					<div class="flow tight">
						<div class="card muted">
							<div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
								<div>
									<div class="text-muted">Dispute reason</div>
									<div>{v.match.disputeReason ?? 'Conflicting reports'}</div>
								</div>
								<div>
									<div class="text-muted">Match</div>
									<div>{formatLabel(v.match.format)} · {v.match.scope} · {v.match.queue}</div>
								</div>
							</div>
						</div>

						<div class="card muted">
							<h3>Evidence</h3>
							{#if (v.match.evidence?.length ?? 0) === 0}
								<div class="text-muted">No evidence submitted.</div>
							{:else}
								<div class="flow tight">
									{#each v.match.evidence as e}
										<div class="card" style="padding:14px;">
											<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
												<strong>Side {e.side}</strong>
												<a class="text-accent" href={e.url} target="_blank" rel="noreferrer">Open link</a>
											</div>
											{#if e.note}
												<div class="text-secondary mt-sm">{e.note}</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<div class="card">
							<h3>Resolve</h3>
							<div class="text-secondary">Pick the winner, optionally add a score and a short note.</div>
							<div class="mt-md" style="display:flex; gap:12px; flex-wrap:wrap; align-items:end;">
								<label style="display:flex; gap:8px; align-items:center;">
									<input type="radio" name="winner" value="A" bind:group={winnerSide} />
									<span>Winner: A</span>
								</label>
								<label style="display:flex; gap:8px; align-items:center;">
									<input type="radio" name="winner" value="B" bind:group={winnerSide} />
									<span>Winner: B</span>
								</label>
								<div style="display:flex; gap:10px; flex-wrap:wrap;">
									<input class="input" style="width:110px;" type="number" placeholder="Score A" bind:value={scoreA} />
									<input class="input" style="width:110px;" type="number" placeholder="Score B" bind:value={scoreB} />
								</div>
							</div>
							<textarea class="input mt-md" rows="2" placeholder="Resolution note (optional)" bind:value={resolutionNote}></textarea>
							<div class="card-footer">
								<button class="btn secondary" on:click={loadDisputes} disabled={loading}>Refresh</button>
								<button class="btn" on:click={resolveSelected} disabled={actionBusy?.startsWith('resolve:') || !winnerSide}>
									{actionBusy?.startsWith('resolve:') ? 'Resolving…' : 'Resolve Match'}
								</button>
							</div>
						</div>

						<div class="card">
							<h3>Integrity Action</h3>
							<p class="text-secondary">Apply an integrity event to a specific participant (separate from resolving).</p>
							<div class="mt-md" style="display:flex; gap:12px; flex-wrap:wrap;">
								<select class="input" bind:value={integrityUserId}>
									<option value="">Select player…</option>
									{#each allParticipants(v) as p}
										<option value={p.id}>{p.username} (Side {p.side})</option>
									{/each}
								</select>
								<select class="input" bind:value={integrityType}>
									{#each integrityTypes as t}
										<option value={t}>{t}</option>
									{/each}
								</select>
								<input class="input" style="width:120px;" type="number" min="1" max="5" bind:value={integritySeverity} />
							</div>
							<input class="input mt-md" placeholder="Description (why)" bind:value={integrityDescription} />
							<div class="card-footer">
								<button class="btn" disabled={!integrityUserId || actionBusy?.startsWith('integrity:')} on:click={applyIntegrity}>
									{actionBusy?.startsWith('integrity:') ? 'Applying…' : 'Apply Integrity'}
								</button>
							</div>
							<p class="text-muted mt-sm">Tip: severity is 1 (light) to 5 (heavy).</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.page-header { margin: var(--space-xl) 0 var(--space-lg); }
	.pill.warn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 999px;
		background: rgba(255, 180, 0, 0.12);
		border: 1px solid rgba(255, 180, 0, 0.22);
		color: rgba(255, 210, 120, 1);
		font-size: 0.8rem;
		font-weight: 700;
	}
	.input {
		background: rgba(0,0,0,0.25);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 10px 12px;
		color: var(--text-primary);
	}
	textarea.input { width: 100%; }
</style>
