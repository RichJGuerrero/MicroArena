<script lang="ts">
	import { onMount } from 'svelte';
	import type { ArenaMatchView, ArenaSideKey, IntegrityEventType, AuditEvent } from '$lib/types';

	type ConsoleTab = 'DISPUTES' | 'MATCHES' | 'USERS' | 'AUDIT';
	interface AdminUserRow {
		id: string;
		username: string;
		usernameKey?: string;
		clanId: string | null;
		banned: boolean;
		bannedReason: string | null;
		bannedAt: number | null;
		createdAt?: number;
	}

	let isAdmin = false;
	let loading = true;
	let error: string | null = null;

	let key = '';
	let loggingIn = false;

	let disputes: ArenaMatchView[] = [];
	let matches: ArenaMatchView[] = [];
	let users: AdminUserRow[] = [];
	let audit: AuditEvent[] = [];
	let tab: ConsoleTab = 'DISPUTES';
	let selectedId: string | null = null; // selected match id (disputes OR matches)
	let actionBusy: string | null = null;

	// Match browser
	let matchStatusFilter = '';
	let matchQuery = '';
	let matchLimit = 75;
	let forcingDispute = false;
	let forceDisputeReason = 'Ref review requested';

	// User browser
	let userQuery = '';
	let userLimit = 75;
	let userBanReason = 'Confirmed cheating';

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
		if (!selectedId) return null;
		if (tab === 'MATCHES') return matches.find((d) => d.match.id === selectedId) ?? null;
		return disputes.find((d) => d.match.id === selectedId) ?? null;
	}

	function selectedFromMatches(): ArenaMatchView | null {
		return matches.find((m) => m.match.id === selectedId) ?? null;
	}

function selectedRequired(): ArenaMatchView {
	const v = selected();
	if (!v) throw new Error('No match selected');
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

	async function loadMatches() {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams();
			if (matchStatusFilter) params.set('status', matchStatusFilter);
			if (matchQuery.trim()) params.set('q', matchQuery.trim());
			params.set('limit', String(matchLimit));
			const res = await fetch(`/api/admin/matches?${params.toString()}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to load matches');
			matches = data?.data ?? [];
			if (matches.length && !selectedId) selectedId = matches[0].match.id;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load matches';
			matches = [];
			selectedId = null;
		} finally {
			loading = false;
		}
	}

	async function loadUsers() {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams();
			if (userQuery.trim()) params.set('q', userQuery.trim());
			params.set('limit', String(userLimit));
			const res = await fetch(`/api/admin/users?${params.toString()}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to load users');
			users = data?.data ?? [];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load users';
			users = [];
		} finally {
			loading = false;
		}
	}

	async function loadAudit(limit: number = 100) {
		try {
			const res = await fetch(`/api/admin/audit?limit=${encodeURIComponent(String(limit))}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to load audit');
			audit = data?.data ?? [];
		} catch {
			audit = [];
		}
	}

	onMount(async () => {
		await refreshAdminState();
		if (isAdmin) {
			await loadDisputes();
			await loadAudit(100);
		}
		loading = false;
	});

	async function switchTab(next: ConsoleTab) {
		tab = next;
		selectedId = null;
		if (!isAdmin) return;
		if (next === 'DISPUTES') await loadDisputes();
		if (next === 'MATCHES') await loadMatches();
		if (next === 'USERS') await loadUsers();
		if (next === 'AUDIT') await loadAudit(100);
	}

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
			await loadAudit(100);
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
			audit = [];
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
			await loadAudit(100);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to resolve';
		} finally {
			actionBusy = null;
		}
	}

	async function runAiAssistSelected() {
		const v = selected();
		if (!v) return;
		error = null;
		actionBusy = `ai:${v.match.id}`;
		try {
			const res = await fetch(`/api/admin/matches/${encodeURIComponent(v.match.id)}/ai`, { method: 'POST' });
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to run AI assist');
			if (tab === 'MATCHES') await loadMatches();
			else await loadDisputes();
			await loadAudit(100);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to run AI assist';
		} finally {
			actionBusy = null;
		}
	}

	async function forceDisputeSelected() {
		const v = selectedFromMatches();
		if (!v) return;
		error = null;
		forcingDispute = true;
		actionBusy = `force-dispute:${v.match.id}`;
		try {
			const res = await fetch(`/api/admin/matches/${encodeURIComponent(v.match.id)}/force-dispute`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ disputeReason: forceDisputeReason })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to force dispute');
			await loadMatches();
			await loadDisputes();
			await loadAudit(100);
			tab = 'DISPUTES';
			selectedId = v.match.id;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to force dispute';
		} finally {
			forcingDispute = false;
			actionBusy = null;
		}
	}

	function evidenceBySide(v: ArenaMatchView, side: 'A' | 'B') {
		return (v.match.evidence ?? []).filter((e) => e.side === side);
	}

	function openEvidence(v: ArenaMatchView, side: 'A' | 'B') {
		if (typeof window === 'undefined') return;
		for (const e of evidenceBySide(v, side)) {
			if (!e.url) continue;
			window.open(e.url, '_blank', 'noopener,noreferrer');
		}
	}

	function openAllEvidence(v: ArenaMatchView) {
		openEvidence(v, 'A');
		openEvidence(v, 'B');
	}

	async function copyEvidence(v: ArenaMatchView) {
		const lines = (v.match.evidence ?? []).map((e) => `Side ${e.side}: ${e.url}${e.note ? `  // ${e.note}` : ''}`);
		try {
			await navigator.clipboard.writeText(lines.join('\n'));
		} catch {
			// ignore
		}
	}

	async function banUserDirect(userId: string) {
		await banTarget(userId, null, userBanReason);
		await loadUsers();
	}

	async function unbanUserDirect(userId: string) {
		await unbanTarget(userId);
		await loadUsers();
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

	async function banTarget(userId: string, matchId: string | null, reason?: string | null) {
		error = null;
		actionBusy = `ban:${userId}`;
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ reason: (reason ?? '').trim() || 'Confirmed cheating', matchId })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to ban user');
			await loadDisputes();
			await loadAudit(100);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to ban user';
		} finally {
			actionBusy = null;
		}
	}

	async function unbanTarget(userId: string) {
		error = null;
		actionBusy = `unban:${userId}`;
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/unban`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ note: 'Admin unban' })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to unban user');
			await loadDisputes();
			await loadAudit(100);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to unban user';
		} finally {
			actionBusy = null;
		}
	}

	async function forceDisputeSelected() {
		const v = selected();
		if (!v) return;
		error = null;
		forcingDispute = true;
		try {
			const res = await fetch(`/api/admin/matches/${encodeURIComponent(v.match.id)}/force-dispute`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ disputeReason: forceDisputeReason })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to force dispute');
			// After forcing dispute, hop back to Disputes view.
			tab = 'DISPUTES';
			selectedId = v.match.id;
			await loadDisputes();
			await loadAudit(100);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to force dispute';
		} finally {
			forcingDispute = false;
		}
	}

	function evidenceForSide(v: ArenaMatchView, side: 'A' | 'B') {
		const list = (v.match.evidence ?? []).filter((e) => e.side === side);
		return list;
	}

	function copyText(text: string) {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		navigator.clipboard.writeText(text).catch(() => {
			// ignore
		});
	}

	function openAllEvidence(v: ArenaMatchView, side: 'A' | 'B') {
		if (typeof window === 'undefined') return;
		for (const e of evidenceForSide(v, side)) {
			if (e.url) window.open(e.url, '_blank', 'noopener,noreferrer');
		}
	}

	function copyEvidenceBundle(v: ArenaMatchView) {
		const lines: string[] = [];
		for (const e of v.match.evidence ?? []) {
			lines.push(`[Side ${e.side}] ${e.url}${e.note ? ` — ${e.note}` : ''}`);
		}
		copyText(lines.join('\n'));
	}

	async function banUserStandalone(userId: string) {
		error = null;
		actionBusy = `ban:${userId}`;
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ reason: userBanReason, matchId: null })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to ban user');
			await loadUsers();
			await loadAudit(100);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to ban user';
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

		<div class="tabs" aria-label="Admin Console Tabs">
			<button class="tab {tab==='DISPUTES' ? 'active' : ''}" on:click={() => switchTab('DISPUTES')}>Disputes</button>
			<button class="tab {tab==='MATCHES' ? 'active' : ''}" on:click={() => switchTab('MATCHES')}>Matches</button>
			<button class="tab {tab==='USERS' ? 'active' : ''}" on:click={() => switchTab('USERS')}>Users</button>
			<button class="tab {tab==='AUDIT' ? 'active' : ''}" on:click={() => switchTab('AUDIT')}>Audit</button>
		</div>

		<div class="grid" style="grid-template-columns: 1.1fr 1.4fr; gap: var(--space-lg); align-items:start;">
			<div class="card">
				<div class="card-header">
					{#if tab === 'DISPUTES'}
						<h2>Disputed Matches</h2>
						<p class="text-secondary">These need a ref decision.</p>
					{:else if tab === 'MATCHES'}
						<h2>Match Browser</h2>
						<p class="text-secondary">Find any match (all statuses) and optionally force a dispute for review/testing.</p>
					{:else if tab === 'USERS'}
						<h2>User Browser</h2>
						<p class="text-secondary">Search users and apply ban/unban directly.</p>
					{:else}
						<h2>Audit Log</h2>
						<p class="text-secondary">Accountability trail for overrides.</p>
					{/if}
				</div>

				{#if tab === 'DISPUTES'}
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
				{:else if tab === 'MATCHES'}
					<div class="flow">
						<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
							<select class="input" bind:value={matchStatusFilter}>
								<option value="">All statuses</option>
								<option value="PENDING">PENDING</option>
								<option value="OPEN">OPEN</option>
								<option value="READY">READY</option>
								<option value="LIVE">LIVE</option>
								<option value="DISPUTED">DISPUTED</option>
								<option value="COMPLETED">COMPLETED</option>
								<option value="CANCELLED">CANCELLED</option>
							</select>
							<input class="input" placeholder="Search by id, clan tag, username…" bind:value={matchQuery} />
							<button class="btn ghost sm" on:click={loadMatches} disabled={loading}>Search</button>
						</div>
						{#if loading}
							<div class="text-muted">Loading…</div>
						{:else if matches.length === 0}
							<div class="text-muted">No matches found.</div>
						{:else}
							<div class="flow tight">
								{#each matches as m}
									<button class="card muted" style="text-align:left; width:100%;" on:click={() => (selectedId = m.match.id)}>
										<div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
											<strong>{formatLabel(m.match.format)} {m.match.scope} · {m.match.queue}</strong>
											<span class="pill">{m.match.status}</span>
										</div>
										<div class="text-muted mt-xs">{whoLabel(m, 'A')} vs {whoLabel(m, 'B')}</div>
										<div class="text-muted mt-sm" style="font-size:0.85rem;">
											Evidence: {m.match.evidence?.length ?? 0}
											{#if selectedId === m.match.id} · <span class="text-accent">Selected</span>{/if}
										</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{:else if tab === 'USERS'}
					<div class="flow">
						<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
							<input class="input" placeholder="Search username…" bind:value={userQuery} />
							<button class="btn ghost sm" on:click={loadUsers} disabled={loading}>Search</button>
						</div>
						<input class="input" placeholder="Ban reason" bind:value={userBanReason} />
						{#if loading}
							<div class="text-muted">Loading…</div>
						{:else if users.length === 0}
							<div class="text-muted">No users found.</div>
						{:else}
							<div class="flow tight">
								{#each users as u}
									<div class="card muted" style="padding:12px;">
										<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
											<div>
												<strong>{u.username}</strong>
												<div class="text-muted" style="font-size:0.85rem;">id: {u.id}</div>
											</div>
											<div style="display:flex; gap:8px; align-items:center;">
												<span class="pill {u.banned ? 'warn' : ''}">{u.banned ? 'BANNED' : 'OK'}</span>
												{#if u.banned}
													<button class="btn secondary sm" disabled={actionBusy===`unban:${u.id}`} on:click={() => unbanUserDirect(u.id)}>
														{actionBusy===`unban:${u.id}` ? 'Unbanning…' : 'Unban'}
													</button>
												{:else}
													<button class="btn danger sm" disabled={actionBusy===`ban:${u.id}`} on:click={() => banUserDirect(u.id)}>
														{actionBusy===`ban:${u.id}` ? 'Banning…' : 'Ban'}
													</button>
												{/if}
											</div>
										</div>
										{#if u.bannedReason}
											<div class="text-muted mt-xs" style="font-size:0.9rem;">Reason: {u.bannedReason}</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div class="flow">
						<div style="display:flex; justify-content:flex-end;">
							<button class="btn ghost sm" on:click={() => loadAudit(200)} disabled={loading}>Refresh</button>
						</div>
						{#if loading}
							<div class="text-muted">Loading…</div>
						{:else if audit.length === 0}
							<div class="text-muted">No audit events yet.</div>
						{:else}
							{#each audit.slice(0, 80) as a}
								<div class="card muted" style="padding:10px;">
									<div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
										<strong>{a.action}</strong>
										<span class="text-muted" style="font-size:0.85rem;">{new Date(a.createdAt).toLocaleString()}</span>
									</div>
									{#if a.matchId}
										<div class="text-muted" style="font-size:0.85rem;">match: {a.matchId}</div>
									{/if}
									{#if a.targetUserId}
										<div class="text-muted" style="font-size:0.85rem;">user: {a.targetUserId}</div>
									{/if}
									{#if a.note}
										<div class="text-muted mt-xs" style="font-size:0.9rem;">{a.note}</div>
									{/if}
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>

			<div class="card">
				{#if tab === 'USERS'}
					<h2>User Tools</h2>
					<div class="text-muted">Use the left panel to search, ban, and unban users.</div>
				{:else if tab === 'AUDIT'}
					<h2>Audit Tools</h2>
					<div class="text-muted">Use the left panel to review audit events. This is the platform's "receipt trail".</div>
				{:else if !selected()}
					<h2>Match Details</h2>
					<div class="text-muted">Select a match from the left panel to review.</div>
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
								<div class="text-muted">Status</div>
								<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
									<span class="pill {v.match.status === 'DISPUTED' ? 'warn' : ''}">{v.match.status}</span>
									{#if v.match.status === 'DISPUTED'}
										<span class="text-secondary">{v.match.disputeReason ?? 'Conflicting reports'}</span>
									{/if}
								</div>
							</div>
							<div>
								<div class="text-muted">Match</div>
								<div>{formatLabel(v.match.format)} · {v.match.scope} · {v.match.queue}</div>
							</div>
						</div>
					</div>

					<div class="card muted">
						<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
							<h3 style="margin:0;">Evidence</h3>
							{#if (v.match.evidence?.length ?? 0) > 0}
								<div style="display:flex; gap:8px; flex-wrap:wrap;">
									<button class="btn ghost sm" on:click={() => openAllEvidence(v)}>Open All</button>
									<button class="btn ghost sm" on:click={() => openEvidence(v, 'A')}>Open Side A</button>
									<button class="btn ghost sm" on:click={() => openEvidence(v, 'B')}>Open Side B</button>
									<button class="btn ghost sm" on:click={() => copyEvidence(v)}>Copy list</button>
								</div>
							{/if}
						</div>
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

							<hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:14px 0;" />
							<div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
								<h3 style="margin:0;">AI Assist (Ref Triage)</h3>
								<button class="btn ghost sm" on:click={runAiAssistSelected} disabled={actionBusy?.startsWith('ai:')}> 
									{actionBusy?.startsWith('ai:') ? 'Running…' : 'Run AI Assist'}
								</button>
							</div>
							{#if v.match.aiAssist}
								<div class="text-muted" style="font-size:0.85rem;">Last run: {new Date(v.match.aiAssist.updatedAt).toLocaleString()} · Provider: {v.match.aiAssist.provider}{v.match.aiAssist.model ? ` (${v.match.aiAssist.model})` : ''}</div>
								{#if v.match.aiAssist.error}
									<div class="text-secondary" style="margin-top:6px;">Provider note: {v.match.aiAssist.error}</div>
								{/if}
								<div class="card" style="padding:14px; margin-top:10px;">
									<div class="text-secondary">{v.match.aiAssist.summary}</div>
									{#if (v.match.aiAssist.flags?.length ?? 0) > 0}
										<div class="mt-sm" style="display:flex; flex-direction:column; gap:8px;">
											{#each v.match.aiAssist.flags as f}
												<div class="card muted" style="padding:10px;">
													<strong>{f.severity}</strong> · <span class="text-muted">{f.code}</span>
													<div class="text-secondary mt-xs">{f.message}</div>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-muted mt-sm">No flags.</div>
									{/if}
								</div>
							{:else}
								<div class="text-muted">No AI assist run yet. This is optional, non-binding triage for refs.</div>
							{/if}
						</div>

					{#if tab === 'MATCHES' && v.match.status !== 'DISPUTED' && v.match.status !== 'COMPLETED'}
						<div class="card">
							<h3>Force Dispute</h3>
							<p class="text-secondary">Moves this match into DISPUTED so refs can review and resolve. Helpful for testing the pipeline.</p>
							<input class="input" placeholder="Dispute reason" bind:value={forceDisputeReason} />
							<div class="card-footer">
								<button class="btn danger" on:click={forceDisputeSelected} disabled={forcingDispute || actionBusy?.startsWith('force-dispute:')}>
									{forcingDispute ? 'Forcing…' : 'Force Dispute'}
								</button>
							</div>
						</div>
					{/if}

					{#if v.match.status === 'DISPUTED'}
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

					<div class="card">
						<h3>Ban / Unban (Confirmed Cheating)</h3>
						<p class="text-secondary">Hard stop. Banned users cannot create/join/ready/report or submit evidence.</p>
						<div class="mt-md" style="display:flex; flex-direction:column; gap:10px;">
							{#each allParticipants(v) as p}
								<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
									<div style="display:flex; gap:10px; align-items:center;">
										<strong>{p.username}</strong>
										<span class="pill {p.banned ? 'warn' : ''}">{p.banned ? 'BANNED' : 'OK'}</span>
									</div>
									<div style="display:flex; gap:8px;">
										{#if p.banned}
											<button class="btn secondary" disabled={actionBusy === `unban:${p.id}`} on:click={() => unbanTarget(p.id)}>
												{actionBusy === `unban:${p.id}` ? 'Unbanning…' : 'Unban'}
											</button>
										{:else}
											<button class="btn danger" disabled={actionBusy === `ban:${p.id}`} on:click={() => banTarget(p.id, v.match.id)}>
												{actionBusy === `ban:${p.id}` ? 'Banning…' : 'Ban'}
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
						<p class="text-muted mt-sm">You can still apply integrity events separately if you want a graded penalty instead of a ban.</p>
					</div>
					{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.page-header { margin: var(--space-xl) 0 var(--space-lg); }
	.divider { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: var(--space-md) 0; }
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

	.tabs {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin: var(--space-md) 0 var(--space-lg);
	}
	.tab {
		border: 1px solid rgba(255,255,255,0.14);
		background: rgba(255,255,255,0.06);
		color: var(--text);
		padding: 10px 14px;
		border-radius: 999px;
		cursor: pointer;
		font-weight: 600;
	}
	.tab:hover { background: rgba(255,255,255,0.09); }
	.tab.active {
		border-color: rgba(255,255,255,0.28);
		background: rgba(255,255,255,0.12);
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
