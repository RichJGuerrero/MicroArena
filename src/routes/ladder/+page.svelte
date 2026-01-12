<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getIntegrityLevel } from '$lib/types';
	import type { LadderEntry } from '$lib/types';

	type TabKey = 'singles' | 'doubles' | 'team' | 'clans';

	const tabs: { key: TabKey; label: string; emoji: string; hint: string }[] = [
		{ key: 'singles', label: 'Singles', emoji: '⚔️', hint: '1v1 · Player · Ranked' },
		{ key: 'doubles', label: 'Doubles', emoji: '🤝', hint: '2v2 · Player · Ranked' },
		{ key: 'team', label: 'Team', emoji: '🛡️', hint: '3v3/4v4 · Player · Ranked' },
		{ key: 'clans', label: 'Clans', emoji: '🏰', hint: '4v4 · Clan · Ranked' }
	];

	let activeTab: TabKey = 'clans';
	let ladder: LadderEntry[] = [];
	let loading = true;

	$: totalXp = ladder.reduce((sum, e) => sum + (e.xp ?? 0), 0);

	function formatLastMatch(ts: number | null): string {
		if (!ts) return '—';
		try {
			return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
		} catch {
			return '—';
		}
	}

	function emptyMessage(tab: TabKey): { title: string; body: string; cta?: { label: string; href: string } } {
		switch (tab) {
			case 'clans':
				return {
					title: 'No ranked Clan Ladder matches yet.',
					body: 'The Clan Ladder is 4v4 only. Once a ranked 4v4 clan match is completed, it will appear here.',
					cta: { label: 'Go to Clans', href: '/clans' }
				};
			case 'team':
				return {
					title: 'Team Ladder is waiting on ranked player matches.',
					body: 'This tab will track ranked 3v3 and 4v4 player-scoped matches (separate from clan stats).',
					cta: { label: 'View Clans', href: '/clans' }
				};
			case 'doubles':
				return {
					title: 'Doubles Ladder is waiting on ranked player matches.',
					body: 'This tab will track ranked 2v2 player-scoped matches once the ladder match flow is live.',
					cta: { label: 'View Clans', href: '/clans' }
				};
			case 'singles':
			default:
				return {
					title: 'Singles Ladder is waiting on ranked player matches.',
					body: 'This tab will track ranked 1v1 player-scoped matches (does not affect clan stats).',
					cta: { label: 'View Clans', href: '/clans' }
				};
		}
	}

	async function load(tab: TabKey) {
		loading = true;
		ladder = [];
		try {
			const res = await fetch(`/api/ladder?tab=${tab}`);
			if (res.ok) {
				const data = await res.json();
				ladder = data.ladder ?? [];
			}
		} catch (e) {
			console.error(e);
		}
		loading = false;
	}

	function setTab(tab: TabKey) {
		if (tab === activeTab) return;
		activeTab = tab;
		goto(`/ladder?tab=${tab}`, { replaceState: true, keepFocus: true, noScroll: true });
		load(tab);
	}

	onMount(() => {
		const urlTab = $page.url.searchParams.get('tab')?.toLowerCase() as TabKey | null;
		if (urlTab && tabs.some((t) => t.key === urlTab)) activeTab = urlTab;
		load(activeTab);
	});
</script>

<svelte:head>
	<title>Ladders — MicroArena</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>🏆 Ladders</h1>
		<p class="subtitle">Ranked activity ladders for Season 1</p>
	</div>

	<div class="tabs card">
		{#each tabs as t}
			<button
				type="button"
				class="tab"
				class:active={activeTab === t.key}
				on:click={() => setTab(t.key)}
			>
				<span class="tab-emoji">{t.emoji}</span>
				<span class="tab-label">{t.label}</span>
				<span class="tab-hint">{t.hint}</span>
			</button>
		{/each}
	</div>

	<div class="season-info card mt-lg">
		<div class="season-stat">
			<span class="stat-value text-accent">1</span>
			<span class="stat-label">Season</span>
		</div>
		<div class="season-stat">
			<span class="stat-value">{ladder.length}</span>
			<span class="stat-label">Entries</span>
		</div>
		<div class="season-stat">
			<span class="stat-value">{totalXp}</span>
			<span class="stat-label">Total XP</span>
		</div>
	</div>

	<div class="explainer card mt-lg">
		<h3>How it works (for now)</h3>
		<p class="text-secondary mt-sm">
			Ranked matches feed ladders. Unranked matches are practice and do not affect ladders.
		</p>
		<ul class="bullets mt-md">
			<li><strong>100 XP</strong> per completed ranked match</li>
			<li><strong>+50 XP</strong> bonus per ranked win</li>
			<li>Tabs separate formats and scope (Player vs Clan)</li>
		</ul>
		<p class="text-muted mt-md">
			Integrity still matters: low integrity can restrict tournament eligibility regardless of ladder position.
		</p>
	</div>

	{#if loading}
		<div class="loading"><div class="spinner"></div></div>
	{:else if ladder.length === 0}
		{@const msg = emptyMessage(activeTab)}
		<div class="empty-state card">
			<h3>{msg.title}</h3>
			<p class="text-secondary mt-sm">{msg.body}</p>
			{#if msg.cta}
				<a class="btn mt-md" href={msg.cta.href}>{msg.cta.label}</a>
			{/if}
		</div>
	{:else}
		<div class="table-wrapper mt-lg">
			<table>
				<thead>
					<tr>
						<th>Rank</th>
						<th>Team</th>
						<th>XP</th>
						<th>Matches</th>
						<th>Record</th>
						<th>Last Match</th>
						<th>Integrity</th>
					</tr>
				</thead>
				<tbody>
					{#each ladder as entry}
						<tr>
							<td class="rank-cell">
								<span class="rank" class:top3={entry.rank <= 3}>
									{#if entry.rank === 1}👑
									{:else if entry.rank === 2}🥈
									{:else if entry.rank === 3}🥉
									{:else}{entry.rank}{/if}
								</span>
							</td>
							<td>
								<a href="/clans/{entry.clan.tag}" class="team-link">
									<span class="clan-tag">{entry.clan.tag}</span>
									<span class="clan-name">{entry.clan.name}</span>
								</a>
							</td>
							<td class="xp-cell"><span class="xp">{entry.xp}</span></td>
							<td class="matches-cell"><span class="matches">{entry.matchesPlayed}</span></td>
							<td class="record-cell">
								<span class="wins">{entry.wins}W</span>
								<span class="separator">-</span>
								<span class="losses">{entry.losses}L</span>
							</td>
							<td class="lastmatch-cell"><span class="lastmatch">{formatLastMatch(entry.lastMatchAt)}</span></td>
							<td>
								<span class="integrity-badge {getIntegrityLevel(entry.clan.integrity)}">{entry.clan.integrity}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="notes card mt-lg">
			<h3>Notes</h3>
			<p class="text-secondary">
				Launch ladders are intentionally simple and transparent. As MicroArena grows, ladders can evolve into
				skill-based ratings, format-specific ELO, and seasonal prestige rewards.
			</p>
		</div>
	{/if}
</div>

<style>
	.page-header { margin: var(--space-xl) 0; }
	.subtitle { color: var(--text-secondary); margin-top: var(--space-xs); }

	.tabs {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-sm);
		padding: var(--space-sm);
	}
	.tab {
		display: grid;
		gap: 2px;
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.18);
		cursor: pointer;
		text-align: left;
		transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
	}
	.tab:hover { transform: translateY(-1px); border-color: rgba(255, 255, 255, 0.18); }
	.tab.active {
		border-color: rgba(255, 255, 255, 0.28);
		background: rgba(0, 0, 0, 0.28);
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
	}
	.tab-emoji { font-size: 1.1rem; }
	.tab-label { font-weight: 700; }
	.tab-hint { color: var(--text-muted); font-size: 0.75rem; }

	.season-info {
		display: flex;
		justify-content: center;
		gap: var(--space-3xl);
		padding: var(--space-lg);
	}
	.season-stat { text-align: center; }
	.stat-value { font-family: var(--font-mono); font-size: 2rem; font-weight: 700; display: block; }
	.stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }

	.explainer { max-width: 760px; }
	.bullets {
		margin: 0;
		padding-left: 1.2rem;
		display: grid;
		gap: var(--space-sm);
		color: var(--text-secondary);
	}
	.bullets li strong { color: var(--text-primary); }

	.loading { display: flex; justify-content: center; padding: var(--space-3xl); }

	.rank-cell { width: 80px; text-align: center; }
	.rank { font-size: 1.25rem; font-weight: 700; }
	.rank.top3 { font-size: 1.5rem; }

	.team-link { display: flex; align-items: center; gap: var(--space-sm); }
	.team-link:hover .clan-name { color: var(--text-primary); }
	.clan-name { color: var(--text-secondary); transition: color 0.2s; }

	.xp-cell, .matches-cell, .record-cell, .lastmatch-cell { text-align: center; }
	.xp, .matches, .lastmatch { font-family: var(--font-mono); font-weight: 700; }
	.xp { color: var(--accent); }

	.wins { color: var(--success); font-weight: 600; }
	.losses { color: var(--error); font-weight: 600; }
	.separator { color: var(--text-muted); margin: 0 2px; }

	.empty-state { max-width: 560px; }
	.notes { max-width: 760px; }

	@media (max-width: 900px) {
		.tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}

	@media (max-width: 768px) {
		.season-info { flex-direction: column; gap: var(--space-md); }
		table thead th:nth-child(6),
		table tbody td:nth-child(6) { display: none; }
	}
</style>
