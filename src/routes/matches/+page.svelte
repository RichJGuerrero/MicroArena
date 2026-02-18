<script lang="ts">
	import { onMount } from 'svelte';
	import { currentUser, isAuthenticated } from '$lib/auth';
	import type {
		ArenaEvidenceItem,
		ArenaMatchView,
		ArenaSideKey,
		BeefMatch,
		MatchQueue,
		MatchScope
	} from '$lib/types';

	type Visibility = 'OPEN' | 'DIRECT';

	let matches: ArenaMatchView[] = [];
	let loading = true;
	let error: string | null = null;
	let actionBusy: string | null = null;
	let now = Date.now();

	// UI: compact match board (GB/CMG-style)
	let expanded: Record<string, boolean> = {};
	function toggleDetails(id: string) {
		expanded[id] = !expanded[id];
	}

	// Evidence form state (per match id)
	let evidenceUrl: Record<string, string> = {};
	let evidenceNote: Record<string, string> = {};

	// Create form state
	let visibility: Visibility = 'OPEN';
	let scope: MatchScope = 'PLAYER';
	let format: BeefMatch['format'] = '1v1';
	let queue: MatchQueue = 'RANKED';
	let ruleset = 'Standard Rules';
	let target = '';
	let scheduledTimeLocal = '';

	const teamSize = (f: BeefMatch['format']) => {
		switch (f) {
			case '1v1':
				return 1;
			case '2v2':
				return 2;
			case '3v3':
				return 3;
			case '4v4':
				return 4;
			case '5v5':
				return 5;
			default:
				return 1;
		}
	};

	function myUserId() {
		return $currentUser?.id ?? '';
	}
	function myClanId() {
		return $currentUser?.clanId ?? null;
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/matches');
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to load matches');
			matches = data.matches ?? [];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load matches';
		} finally {
			loading = false;
		}
	}

	function enforceCanon() {
		// Canon: Clan ladder is always Ranked and 4v4 only.
		if (scope === 'CLAN' && queue === 'RANKED') {
			format = '4v4';
		}
		// If someone flips to CLAN while on a solo format, bump to 4v4.
		if (scope === 'CLAN' && (format === '1v1' || format === '2v2' || format === '3v3')) {
			if (queue === 'RANKED') format = '4v4';
		}
		// If they choose a non-4v4 clan match, force it to UNRANKED.
		if (scope === 'CLAN' && format !== '4v4') {
			queue = 'UNRANKED';
		}
	}

	onMount(() => {
		enforceCanon();
		load();
		const t = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(t);
	});

	$: enforceCanon();

	async function createMatch() {
		const userId = myUserId();
		if (!userId) return;
		error = null;
		actionBusy = 'create';
		try {
			const res = await fetch('/api/matches', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					visibility,
					scope,
					format,
					queue,
					ruleset,
					createdBy: userId,
					scheduledTime: scheduledTimeLocal ? Date.parse(scheduledTimeLocal) : undefined,
					target: visibility === 'DIRECT' ? target : undefined
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to create match');
			target = '';
			scheduledTimeLocal = '';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create match';
		} finally {
			actionBusy = null;
		}
	}

	async function join(id: string, side: ArenaSideKey) {
		const userId = myUserId();
		if (!userId) return;
		error = null;
		actionBusy = `join:${id}:${side}`;
		try {
			const res = await fetch(`/api/matches/${id}/join`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId, side })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to join');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to join';
		} finally {
			actionBusy = null;
		}
	}

	async function respond(id: string, action: 'ACCEPT' | 'DECLINE') {
		const userId = myUserId();
		if (!userId) return;
		error = null;
		actionBusy = `respond:${id}:${action}`;
		try {
			const res = await fetch(`/api/matches/${id}/respond`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId, action })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to respond');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to respond';
		} finally {
			actionBusy = null;
		}
	}

	async function reportResult(id: string, winnerSide: ArenaSideKey) {
		const userId = myUserId();
		if (!userId) return;
		error = null;
		actionBusy = `report:${id}:${winnerSide}`;
		try {
			const res = await fetch(`/api/matches/${id}/report`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId, winnerSide })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to report result');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to report result';
		} finally {
			actionBusy = null;
		}
	}

	async function addEvidence(id: string) {
		const userId = myUserId();
		if (!userId) return;
		const url = (evidenceUrl[id] ?? '').trim();
		const note = (evidenceNote[id] ?? '').trim();
		if (!url) {
			error = 'Please paste a valid evidence URL (clip or screenshot link).';
			return;
		}
		error = null;
		actionBusy = `evidence:add:${id}`;
		try {
			const res = await fetch(`/api/matches/${id}/evidence`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId, url, note: note || null })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to add evidence');
			evidenceUrl[id] = '';
			evidenceNote[id] = '';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add evidence';
		} finally {
			actionBusy = null;
		}
	}

	async function removeEvidence(matchId: string, evidenceId: string) {
		const userId = myUserId();
		if (!userId) return;
		error = null;
		actionBusy = `evidence:remove:${matchId}:${evidenceId}`;
		try {
			const res = await fetch(`/api/matches/${matchId}/evidence`, {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId, evidenceId })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to remove evidence');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to remove evidence';
		} finally {
			actionBusy = null;
		}
	}

	const incomingChallenges = () => {
		const uid = myUserId();
		const cid = myClanId();
		return matches.filter((x) => {
			const m = x.match;
			if (m.visibility !== 'DIRECT') return false;
			if (m.status !== 'PENDING') return false;
			if (m.scope === 'PLAYER') return m.challengedUserId === uid;
			return !!cid && m.challengedClanId === cid;
		});
	};

	// Board view list (GB-style board, plus active/dispute states)
	const openBoard = () =>
		matches.filter((x) => {
			const s = x.match.status;
			return (
				s === 'OPEN' ||
				s === 'READY' ||
				s === 'LIVE' ||
				s === 'DISPUTED' ||
				s === 'COMPLETED' ||
				s === 'DECLINED' ||
				s === 'CANCELLED'
			);
		});

	function sideLabel(side: ArenaSideKey) {
		return side === 'A' ? 'Team A' : 'Team B';
	}

	function rosterText(x: ArenaMatchView, side: ArenaSideKey) {
		const m = x.match;
		const size = teamSize(m.format);
		const roster = side === 'A' ? x.teamAPlayers : x.teamBPlayers;
		return `${roster.length}/${size}`;
	}

	function inRoster(x: ArenaMatchView) {
		const uid = myUserId();
		if (!uid) return null;
		if (x.match.teamA.playerIds.includes(uid)) return 'A' as ArenaSideKey;
		if (x.match.teamB.playerIds.includes(uid)) return 'B' as ArenaSideKey;
		return null;
	}

	function canJoinSide(x: ArenaMatchView, side: ArenaSideKey): boolean {
		const uid = myUserId();
		if (!uid) return false;
		const m = x.match;

		// Join only when OPEN or LIVE (no late joins in READY/PENDING/etc.)
		if (!(m.status === 'OPEN' || m.status === 'LIVE')) return false;
		// Only allow joining direct matches if not pending
		if (m.visibility === 'DIRECT' && (m.status !== 'OPEN' && m.status !== 'LIVE')) return false;
		if (inRoster(x)) return false;

		const size = teamSize(m.format);
		if (side === 'A' && x.teamAPlayers.length >= size) return false;
		if (side === 'B' && x.teamBPlayers.length >= size) return false;

		if (m.scope === 'CLAN') {
			const cid = myClanId();
			if (!cid) return false;

			if (side === 'A') return m.teamA.clanId === cid;

			// Team B: can claim if open + no clan set; otherwise must match
			return !m.teamB.clanId ? m.visibility === 'OPEN' : m.teamB.clanId === cid;
		}

		return true;
	}

	// GB-style board action: "Accept Match" claims the opponent slot (Team B)
	function canAcceptMatch(x: ArenaMatchView): boolean {
		const uid = myUserId();
		if (!uid) return false;
		const m = x.match;
		if (m.visibility !== 'OPEN') return false;
		if (m.status !== 'OPEN') return false;
		if (inRoster(x)) return false;
		return canJoinSide(x, 'B');
	}

	async function acceptMatch(x: ArenaMatchView) {
		await join(x.match.id, 'B');
	}

	function canReport(x: ArenaMatchView): boolean {
		const uid = myUserId();
		if (!uid) return false;
		const m = x.match;
		if (m.status === 'COMPLETED') return false;
		if (!(m.status === 'LIVE' || m.status === 'DISPUTED')) return false;
		return inRoster(x) !== null;
	}

	function myReadySide(x: ArenaMatchView): ArenaSideKey | null {
		return inRoster(x);
	}

	function isSideReady(x: ArenaMatchView, side: ArenaSideKey): boolean {
		return side === 'A' ? !!x.match.readyAAt : !!x.match.readyBAt;
	}

	function canReadyUp(x: ArenaMatchView): boolean {
		if (!myUserId()) return false;
		if (x.match.status !== 'READY') return false;
		const side = myReadySide(x);
		if (!side) return false;
		return !isSideReady(x, side);
	}

	function readyTimeLeftLabel(deadlineAt: number | null): string {
		if (!deadlineAt) return '—';
		const ms = deadlineAt - now;
		if (ms <= 0) return 'Expired';
		const total = Math.floor(ms / 1000);
		const m = Math.floor(total / 60);
		const s = (total % 60).toString().padStart(2, '0');
		return `${m}:${s}`;
	}

	async function readyUp(matchId: string) {
		const userId = myUserId();
		if (!userId) return;
		error = null;
		actionBusy = `ready:${matchId}`;
		try {
			const res = await fetch(`/api/matches/${matchId}/ready`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to ready up');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to ready up';
		} finally {
			actionBusy = null;
		}
	}

	function reportLabel(side: ArenaSideKey | null) {
		return side ? (side === 'A' ? 'Team A' : 'Team B') : 'No report yet';
	}

	function myReport(x: ArenaMatchView): ArenaSideKey | null {
		const t = inRoster(x);
		if (!t) return null;
		return t === 'A' ? x.match.reportA : x.match.reportB;
	}

	function evidenceList(x: ArenaMatchView, side: ArenaSideKey): ArenaEvidenceItem[] {
		const list = Array.isArray((x.match as any).evidence) ? ((x.match as any).evidence as ArenaEvidenceItem[]) : [];
		return list
			.filter((e) => e && e.side === side)
			.slice()
			.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
	}

	function teamTitle(x: ArenaMatchView, side: ArenaSideKey) {
		const m = x.match;
		if (m.scope === 'CLAN') {
			const clan = side === 'A' ? x.teamAClan : x.teamBClan;
			return clan ? `${clan.tag} (${clan.name})` : side === 'A' ? 'Your Clan' : 'Open';
		}
		const roster = side === 'A' ? x.teamAPlayers : x.teamBPlayers;
		return roster.length ? roster.map((p) => p.username).join(', ') : 'Open';
	}

	function formatScheduled(ms: number | null | undefined) {
		if (!ms) return 'TBD';
		try {
			return new Date(ms).toLocaleString();
		} catch {
			return 'TBD';
		}
	}

	function statusBadge(s: string) {
		switch (s) {
			case 'PENDING':
				return 'Pending';
			case 'OPEN':
				return 'Open';
			case 'READY':
				return 'Ready Up';
			case 'LIVE':
				return 'Live';
			case 'DISPUTED':
				return 'Disputed';
			case 'COMPLETED':
				return 'Completed';
			case 'DECLINED':
				return 'Declined';
			case 'CANCELLED':
				return 'Cancelled';
			default:
				return s;
		}
	}
</script>

<div class="container">
	<h1>Matches</h1>
	<p class="lead">Create open matches like old-school GB/CMG, or send direct challenges.</p>

	{#if error}
		<div class="banner error">{error}</div>
	{/if}

	<section class="card">
		<h2>Create Match</h2>
		{#if !$isAuthenticated}
			<div class="hint">Log in to create matches and accept open matches.</div>
		{/if}

		<div class="grid">
			<div class="field">
				<label for="matchVisibility">Type</label>
				<select id="matchVisibility" bind:value={visibility}>
					<option value="OPEN">Open Match</option>
					<option value="DIRECT">Direct Challenge</option>
				</select>
			</div>

			<div class="field">
				<label for="matchScope">Scope</label>
				<select id="matchScope" bind:value={scope}>
					<option value="PLAYER">Player</option>
					<option value="CLAN">Clan</option>
				</select>
			</div>

			<div class="field">
				<label for="matchFormat">Format</label>
				<select id="matchFormat" bind:value={format} disabled={scope === 'CLAN' && queue === 'RANKED'}>
					<option value="1v1">1v1</option>
					<option value="2v2">2v2</option>
					<option value="3v3">3v3</option>
					<option value="4v4">4v4</option>
					<option value="5v5">5v5</option>
				</select>
				{#if scope === 'CLAN' && queue === 'RANKED'}
					<div class="hint">Clan ranked matches are 4v4 only (Big Dawg).</div>
				{/if}
			</div>

			<div class="field">
				<label for="matchQueue">Queue</label>
				<select id="matchQueue" bind:value={queue}>
					<option value="RANKED">Ranked</option>
					<option value="UNRANKED">Unranked</option>
				</select>
				<div class="hint">Unranked affects nothing. Ranked affects XP and ladders.</div>
			</div>

			<div class="field wide">
				<label for="matchRuleset">Ruleset</label>
				<input id="matchRuleset" type="text" bind:value={ruleset} maxlength="60" />
			</div>

			<div class="field">
				<label for="matchScheduled">Scheduled</label>
				<input id="matchScheduled" type="datetime-local" bind:value={scheduledTimeLocal} />
				<div class="hint">Optional. Leave blank for TBD.</div>
			</div>

			{#if visibility === 'DIRECT'}
				<div class="field wide">
					<label for="matchTarget">{scope === 'PLAYER' ? 'Target Username' : 'Target Clan Tag'}</label>
					<input
						id="matchTarget"
						type="text"
						bind:value={target}
						placeholder={scope === 'PLAYER' ? 'e.g. Micro' : 'e.g. RAZR'}
					/>
					<div class="hint">They will need to accept before the match opens.</div>
				</div>
			{/if}
		</div>

		<div class="actions">
			<button class="btn" on:click={createMatch} disabled={!$isAuthenticated || actionBusy === 'create'}>
				{visibility === 'DIRECT' ? 'Send Challenge' : 'Create Match'}
			</button>
			<button class="btn secondary" on:click={load} disabled={loading}>Refresh</button>
		</div>
	</section>

	{#if loading}
		<p class="muted">Loading matches…</p>
	{:else}
		{#if incomingChallenges().length}
			<section class="section">
				<h2>Incoming Challenges</h2>
				<div class="stack">
					{#each incomingChallenges() as x (x.match.id)}
						<div class="match-card">
							<div class="topline">
								<div class="title">
									<span class="pill">Direct</span>
									<span class="pill">{x.match.format}</span>
									<span class="pill">{x.match.queue}</span>
									<span class="pill">{x.match.scope}</span>
								</div>
								<div class="status">{statusBadge(x.match.status)}</div>
							</div>

							<div class="meta">
								<span class="muted">Scheduled:</span> {formatScheduled(x.match.scheduledTime)}
								<span class="divider"></span>
								<span class="muted">Ruleset:</span> {x.match.ruleset}
							</div>

							<div class="teams">
								<div>
									<div class="team-label">Team A</div>
									<div class="team-title">{teamTitle(x, 'A')}</div>
								</div>
								<div>
									<div class="team-label">Team B</div>
									<div class="team-title">{teamTitle(x, 'B')}</div>
								</div>
							</div>

							<div class="actions">
								<button
									class="btn"
									on:click={() => respond(x.match.id, 'ACCEPT')}
									disabled={actionBusy === `respond:${x.match.id}:ACCEPT`}
								>
									Accept
								</button>
								<button
									class="btn secondary"
									on:click={() => respond(x.match.id, 'DECLINE')}
									disabled={actionBusy === `respond:${x.match.id}:DECLINE`}
								>
									Decline
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<section class="section">
			<h2>Match Board</h2>

			{#if openBoard().length === 0}
				<p class="muted">No matches yet. Create the first one and light the signal.</p>
			{:else}
				<div class="stack">
					{#each openBoard() as x (x.match.id)}
						<div class="match-card">
							<div class="topline">
								<div class="title">
									<span class="pill">{x.match.visibility === 'DIRECT' ? 'Direct' : 'Open'}</span>
									<span class="pill">{x.match.format}</span>
									<span class="pill">{x.match.queue}</span>
									<span class="pill">{x.match.scope}</span>
								</div>
								<div class="status">{statusBadge(x.match.status)}</div>
							</div>

							<div class="meta">
								<span class="muted">Scheduled:</span> {formatScheduled(x.match.scheduledTime)}
								<span class="divider"></span>
								<span class="muted">Ruleset:</span> {x.match.ruleset}
							</div>

							<div class="teams">
								<div>
									<div class="team-label">
										Team A <span class="muted">({rosterText(x, 'A')})</span>
									</div>
									<div class="team-title">{teamTitle(x, 'A')}</div>
								</div>
								<div>
									<div class="team-label">
										Team B <span class="muted">({rosterText(x, 'B')})</span>
									</div>
									<div class="team-title">{teamTitle(x, 'B')}</div>
								</div>
							</div>

							{#if x.match.status === 'READY'}
								<div class="banner info flow-callout">
									Ready-Up required: both teams must ready up before the timer expires.
									<a href="/refs#ready">Learn more</a>
								</div>
							{/if}

							{#if x.match.status === 'LIVE'}
								<div class="hint flow-callout">
									Result reporting: each team reports who won. Matching reports complete the match. Conflicts create a dispute.
									<a href="/refs#reporting">Details</a>
								</div>
							{/if}

							{#if x.match.status === 'DISPUTED'}
								<div class="banner warn flow-callout">
									Dispute flow: update your report to match the other side (if you mis-clicked), or wait for a ref decision.
									<a href="/refs#disputes">How disputes work</a>
								</div>
							{/if}

							{#if x.match.resolutionNote}
								<div class="banner warn">{x.match.resolutionNote}</div>
							{/if}

							{#if x.match.status === 'READY'}
								<div class="ready-panel">
									<div class="report-row">
										<span class="muted">Ready:</span>
										Team A {isSideReady(x, 'A') ? '✓' : '…'} | Team B {isSideReady(x, 'B') ? '✓' : '…'}
									</div>
									<div class="report-row"><span class="muted">Time left:</span> {readyTimeLeftLabel(x.match.readyDeadlineAt)}</div>
									<div class="hint">Both teams must ready up to unlock result reporting.</div>
								</div>
							{/if}

							<!-- Completed winner is shown in the details panel below; keep the board header clean. -->
							<!-- Board actions: GB-style Accept + Details toggle -->
							<div class="actions">
								{#if canAcceptMatch(x)}
									<button class="btn" on:click={() => acceptMatch(x)} disabled={actionBusy === `join:${x.match.id}:B`}>
										Accept Match
									</button>
								{:else}
									{#if x.match.visibility === 'OPEN' && x.match.status === 'OPEN'}
										<div class="hint">Not eligible to accept this match.</div>
									{/if}
								{/if}

								<button class="btn secondary" on:click={() => toggleDetails(x.match.id)}>
									{expanded[x.match.id] ? 'Hide Details' : 'View Details'}
								</button>
							</div>

							<!-- Always show core live/dispute panels; for OPEN matches keep it compact unless expanded -->
							{#if expanded[x.match.id] || x.match.status === 'READY' || x.match.status === 'LIVE' || x.match.status === 'DISPUTED' || x.match.status === 'COMPLETED'}
								{#if x.match.status === 'READY'}
									<div class="ready-panel">
										<div class="report-row">
											<span class="muted">Ready:</span>
											Team A {isSideReady(x, 'A') ? '✓' : '…'} | Team B {isSideReady(x, 'B') ? '✓' : '…'}
										</div>
										<div class="report-row">
											<span class="muted">Time left:</span> {readyTimeLeftLabel(x.match.readyDeadlineAt)}
										</div>
										<div class="actions" style="margin-top: 10px;">
											{#if myReadySide(x)}
												<button
													class="btn"
													on:click={() => readyUp(x.match.id)}
													disabled={!canReadyUp(x) || actionBusy === `ready:${x.match.id}`}
												>
													{canReadyUp(x) ? 'Ready Up' : 'Ready ✓'}
												</button>
											{:else}
												<div class="hint">Rosters locked. Waiting for teams to ready up.</div>
											{/if}
										</div>
									</div>
								{/if}

								{#if x.match.status === 'COMPLETED'}
									<div class="winner">
										Winner: {x.match.winnerSide ? (x.match.winnerSide === 'A' ? 'Team A' : 'Team B') : '—'}
									</div>
								{/if}

								{#if x.match.status === 'LIVE' || x.match.status === 'DISPUTED' || x.match.status === 'COMPLETED'}
									<div class="report-panel">
										<div class="report-row"><span class="muted">Team A reported:</span> {reportLabel(x.match.reportA)}</div>
										<div class="report-row"><span class="muted">Team B reported:</span> {reportLabel(x.match.reportB)}</div>

										{#if x.match.status === 'DISPUTED'}
											<div class="banner warn">Dispute: {x.match.disputeReason ?? 'Conflicting reports'}</div>
										{/if}

										<div class="hint flow-hint">
											How it works: both teams report a winner. If reports match, the match completes. If not, it becomes DISPUTED until resolved.
											<a href="/refs#reporting">Learn more about reporting</a>
										</div>

										{#if canReport(x)}
											<div class="report-actions">
												<button
													class="btn {myReport(x) === 'A' ? 'active' : ''}"
													on:click={() => reportResult(x.match.id, 'A')}
													disabled={actionBusy === `report:${x.match.id}:A`}
												>
													Report Team A Win
												</button>
												<button
													class="btn secondary {myReport(x) === 'B' ? 'active' : ''}"
													on:click={() => reportResult(x.match.id, 'B')}
													disabled={actionBusy === `report:${x.match.id}:B`}
												>
													Report Team B Win
												</button>
											</div>
											<div class="hint">Your team can update its report until both sides agree.</div>
										{:else}
											{#if x.match.status === 'LIVE' || x.match.status === 'DISPUTED'}
												<div class="hint">Only match participants can report a result.</div>
											{/if}
										{/if}
									</div>
								{/if}

								<!-- Evidence (LIVE/DISPUTED only) -->
								{#if x.match.status === 'DISPUTED' || x.match.status === 'LIVE'}
									<div class="evidence">
										<div class="evidence-title">Evidence</div>

										{#if inRoster(x)}
											<div class="evidence-form">
												<input
													class="input"
													placeholder="Paste clip or screenshot URL (https://...)"
													bind:value={evidenceUrl[x.match.id]}
												/>
												<input
													class="input"
													placeholder="Optional note (e.g., Round 3, 0:42)"
													bind:value={evidenceNote[x.match.id]}
												/>
												<button
													class="btn secondary"
													on:click={() => addEvidence(x.match.id)}
													disabled={actionBusy === `evidence:add:${x.match.id}`}
												>
													Add Evidence
												</button>
											</div>
										{:else}
											<div class="hint">Only match participants can submit evidence.</div>
										{/if}

										<div class="evidence-grid">
											<div class="evidence-col">
												<div class="muted small">Team A</div>
												{#if evidenceList(x, 'A').length === 0}
													<div class="muted small">No evidence yet.</div>
												{:else}
													{#each evidenceList(x, 'A') as ev (ev.id)}
														<div class="evidence-item">
															<a class="evidence-link" href={ev.url} target="_blank" rel="noreferrer">{ev.url}</a>
															{#if ev.note}
																<div class="muted small">{ev.note}</div>
															{/if}
															{#if ev.addedBy === myUserId()}
																<button
																	class="btn ghost sm"
																	on:click={() => removeEvidence(x.match.id, ev.id)}
																	disabled={actionBusy === `evidence:remove:${x.match.id}:${ev.id}`}
																>
																	Remove
																</button>
															{/if}
														</div>
													{/each}
												{/if}
											</div>

											<div class="evidence-col">
												<div class="muted small">Team B</div>
												{#if evidenceList(x, 'B').length === 0}
													<div class="muted small">No evidence yet.</div>
												{:else}
													{#each evidenceList(x, 'B') as ev (ev.id)}
														<div class="evidence-item">
															<a class="evidence-link" href={ev.url} target="_blank" rel="noreferrer">{ev.url}</a>
															{#if ev.note}
																<div class="muted small">{ev.note}</div>
															{/if}
															{#if ev.addedBy === myUserId()}
																<button
																	class="btn ghost sm"
																	on:click={() => removeEvidence(x.match.id, ev.id)}
																	disabled={actionBusy === `evidence:remove:${x.match.id}:${ev.id}`}
																>
																	Remove
																</button>
															{/if}
														</div>
													{/each}
												{/if}
											</div>
										</div>

										<div class="hint">Tip: link a clip, a screenshot, or a timestamped VOD segment. Keep it clean and factual.</div>
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.container {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px;
	}

	.lead {
		color: rgba(255, 255, 255, 0.8);
		margin-top: -8px;
		margin-bottom: 20px;
	}

	.section {
		margin-top: 18px;
	}

	.card {
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 14px;
		padding: 16px;
		backdrop-filter: blur(10px);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
		margin-top: 12px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.field label {
		color: rgba(255, 255, 255, 0.85);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.field select,
	.field input {
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(0, 0, 0, 0.25);
		color: rgba(255, 255, 255, 0.9);
		padding: 10px 12px;
		outline: none;
	}

	.field select:disabled {
		opacity: 0.7;
	}

	.hint {
		color: rgba(255, 255, 255, 0.6);
		font-size: 12px;
		line-height: 1.3;
	}

	.hint a {
		color: rgba(255, 255, 255, 0.85);
		text-decoration: underline;
	}
	.banner a {
		color: rgba(255, 255, 255, 0.9);
		text-decoration: underline;
	}
	.banner a:hover,
	.hint a:hover {
		opacity: 0.9;
	}

	.wide {
		grid-column: span 2;
	}

	.actions {
		margin-top: 14px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: center;
	}

	.banner {
		padding: 12px 14px;
		border-radius: 12px;
		margin-bottom: 14px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.35);
	}

	.banner.error {
		border-color: rgba(255, 80, 80, 0.35);
		background: rgba(255, 80, 80, 0.12);
		color: rgba(255, 255, 255, 0.92);
	}

	.banner.warn {
		border-color: rgba(255, 204, 80, 0.35);
		background: rgba(255, 204, 80, 0.12);
		color: rgba(255, 255, 255, 0.92);
	}

	.banner.info {
		border-color: rgba(80, 160, 255, 0.35);
		background: rgba(80, 160, 255, 0.12);
		color: rgba(255, 255, 255, 0.92);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 12px;
	}

	.match-card {
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 14px;
		padding: 14px;
		backdrop-filter: blur(10px);
	}

	.topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.title {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(0, 0, 0, 0.25);
		color: rgba(255, 255, 255, 0.85);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.status {
		color: rgba(255, 255, 255, 0.85);
		font-size: 13px;
	}

	.meta {
		margin-top: 10px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		color: rgba(255, 255, 255, 0.82);
		font-size: 12px;
	}

	.teams {
		margin-top: 12px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.team-label {
		color: rgba(255, 255, 255, 0.6);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.team-title {
		color: rgba(255, 255, 255, 0.92);
		font-size: 14px;
		margin-top: 4px;
	}

	.winner {
		margin-top: 10px;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 600;
	}

	.report-panel {
		margin-top: 12px;
		padding: 12px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.25);
	}

	.evidence {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.evidence-title {
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 8px;
	}

	.evidence-form {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 10px;
		align-items: center;
		margin-bottom: 10px;
	}

	.evidence-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.evidence-col {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 10px;
		background: rgba(0, 0, 0, 0.18);
	}

	.evidence-item {
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.evidence-link {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.9);
		word-break: break-all;
	}

	.small {
		font-size: 12px;
	}

	:global(.btn.ghost) {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.85);
	}

	:global(.btn.sm) {
		padding: 6px 10px;
		font-size: 12px;
		border-radius: 10px;
	}

	.ready-panel {
		margin-top: 12px;
		padding: 12px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.18);
	}

	.report-row {
		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.85);
		margin-bottom: 6px;
	}

	.report-actions {
		margin-top: 10px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	:global(.btn.active) {
		outline: 2px solid rgba(255, 255, 255, 0.25);
		outline-offset: 2px;
	}

	.divider {
		width: 1px;
		height: 24px;
		background: rgba(255, 255, 255, 0.14);
		margin: 0 6px;
	}

	.muted {
		color: rgba(255, 255, 255, 0.6);
	}

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.wide {
			grid-column: span 2;
		}
	}

	@media (max-width: 640px) {
		.teams {
			grid-template-columns: 1fr;
		}
		.evidence-form {
			grid-template-columns: 1fr;
		}
		.evidence-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
