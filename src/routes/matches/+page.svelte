<script lang="ts">
	import { onMount } from 'svelte';
	import { currentUser, isAuthenticated } from '$lib/auth';
	import type { ArenaMatchView, ArenaSideKey, BeefMatch, MatchQueue, MatchScope } from '$lib/types';

	type Visibility = 'OPEN' | 'DIRECT';

	let matches: ArenaMatchView[] = [];
	let loading = true;
	let error: string | null = null;
	let actionBusy: string | null = null;

	// Create form state
	let visibility: Visibility = 'OPEN';
	let scope: MatchScope = 'PLAYER';
	let format: BeefMatch['format'] = '1v1';
	let queue: MatchQueue = 'RANKED';
	let ruleset = 'Standard Rules';
	let target = '';

	const teamSize = (f: BeefMatch['format']) => {
		switch (f) {
			case '1v1': return 1;
			case '2v2': return 2;
			case '3v3': return 3;
			case '4v4': return 4;
			case '5v5': return 5;
			default: return 1;
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

	onMount(async () => {
		enforceCanon();
		await load();
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
					target: visibility === 'DIRECT' ? target : undefined
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to create match');
			target = '';
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

	async function complete(id: string, winnerSide: ArenaSideKey) {
		const userId = myUserId();
		if (!userId) return;
		error = null;
		actionBusy = `complete:${id}:${winnerSide}`;
		try {
			const res = await fetch(`/api/matches/${id}/complete`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId, winnerSide })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error ?? 'Failed to complete');
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to complete';
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

	const openBoard = () => matches.filter((x) => {
		const s = x.match.status;
		return s === 'OPEN' || s === 'LIVE' || s === 'COMPLETED' || s === 'DECLINED';
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
		if (!(m.status === 'OPEN' || m.status === 'LIVE')) return false;
		if (m.visibility === 'DIRECT' && m.status === 'PENDING') return false;
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

	function canRespond(x: ArenaMatchView): boolean {
		const m = x.match;
		if (m.visibility !== 'DIRECT') return false;
		if (m.status !== 'PENDING') return false;
		const uid = myUserId();
		if (!uid) return false;
		if (m.scope === 'PLAYER') return m.challengedUserId === uid;
		const cid = myClanId();
		return !!cid && m.challengedClanId === cid;
	}

	function canComplete(x: ArenaMatchView): boolean {
		const uid = myUserId();
		if (!uid) return false;
		const m = x.match;
		if (m.status === 'COMPLETED') return false;
		return (m.status === 'LIVE' || m.status === 'OPEN') && m.createdBy === uid;
	}

	function teamTitle(x: ArenaMatchView, side: ArenaSideKey) {
		const m = x.match;
		if (m.scope === 'CLAN') {
			const clan = side === 'A' ? x.teamAClan : x.teamBClan;
			return clan ? `${clan.tag} (${clan.name})` : (side === 'A' ? 'Your Clan' : 'Open');
		}
		// PLAYER
		const roster = side === 'A' ? x.teamAPlayers : x.teamBPlayers;
		return roster.length ? roster.map((p) => p.username).join(', ') : 'Open';
	}

	function statusBadge(s: string) {
		switch (s) {
			case 'PENDING': return 'Pending';
			case 'OPEN': return 'Open';
			case 'LIVE': return 'Live';
			case 'COMPLETED': return 'Completed';
			case 'DECLINED': return 'Declined';
			default: return s;
		}
	}
</script>

<div class="container">
	<h1>Matches</h1>
	<p class="lead">
		Create open matches like old-school GB/CMG, or send direct challenges.
	</p>

	{#if error}
		<div class="banner error">{error}</div>
	{/if}

	<section class="card">
		<h2>Create Match</h2>
		{#if !$isAuthenticated}
			<div class="hint">Log in to create matches, join teams, and accept challenges.</div>
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

							<div class="teams">
								<div>
									<div class="team-label">Team A <span class="muted">({rosterText(x, 'A')})</span></div>
									<div class="team-title">{teamTitle(x, 'A')}</div>
								</div>
								<div>
									<div class="team-label">Team B <span class="muted">({rosterText(x, 'B')})</span></div>
									<div class="team-title">{teamTitle(x, 'B')}</div>
								</div>
							</div>

							{#if x.match.status === 'COMPLETED'}
								<div class="winner">
									Winner: {x.match.winnerSide === 'A' ? 'Team A' : 'Team B'}
								</div>
							{/if}

							<div class="actions">
								{#if canRespond(x)}
									<button class="btn" on:click={() => respond(x.match.id, 'ACCEPT')}>Accept</button>
									<button class="btn secondary" on:click={() => respond(x.match.id, 'DECLINE')}>Decline</button>
								{:else}
									<button
										class="btn"
										on:click={() => join(x.match.id, 'A')}
										disabled={!canJoinSide(x, 'A') || actionBusy === `join:${x.match.id}:A`}
									>
										Join Team A
									</button>
									<button
										class="btn secondary"
										on:click={() => join(x.match.id, 'B')}
										disabled={!canJoinSide(x, 'B') || actionBusy === `join:${x.match.id}:B`}
									>
										Join Team B
									</button>

									{#if canComplete(x)}
										<div class="divider"></div>
										<button
											class="btn"
											on:click={() => complete(x.match.id, 'A')}
											disabled={actionBusy?.startsWith('complete:')}
										>
											Mark Team A Win
										</button>
										<button
											class="btn secondary"
											on:click={() => complete(x.match.id, 'B')}
											disabled={actionBusy?.startsWith('complete:')}
										>
											Mark Team B Win
										</button>
									{/if}
								{/if}
							</div>
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

	.wide {
		grid-column: span 2;
	}

	.actions {
		margin-top: 14px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
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
	}
</style>
