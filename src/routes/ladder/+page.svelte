<script lang="ts">
	import { onMount } from 'svelte';
	import { getIntegrityLevel } from '$lib/types';
	import type { LadderEntry } from '$lib/types';
	
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
	
	onMount(async () => {
		try {
			const res = await fetch('/api/ladder');
			if (res.ok) {
				const data = await res.json();
				ladder = data.ladder ?? [];
			}
		} catch (e) {
			console.error(e);
		}
		loading = false;
	});
</script>

<svelte:head>
	<title>XP Ladder — MicroArena</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>🏆 XP Ladder</h1>
		<p class="subtitle">Season 1 Activity Rankings</p>
	</div>
	
	<div class="season-info card">
		<div class="season-stat">
			<span class="stat-value text-accent">1</span>
			<span class="stat-label">Season</span>
		</div>
		<div class="season-stat">
			<span class="stat-value">{ladder.length}</span>
			<span class="stat-label">Teams</span>
		</div>
		<div class="season-stat">
			<span class="stat-value">{totalXp}</span>
			<span class="stat-label">Total XP</span>
		</div>
	</div>

	<div class="explainer card mt-lg">
		<h3>How XP Works</h3>
		<p class="text-secondary mt-sm">
			The XP Ladder measures activity and consistency across Season 1. It is not a skill rating.
		</p>
		<ul class="bullets mt-md">
			<li><strong>100 XP</strong> per completed match</li>
			<li><strong>+50 XP</strong> bonus per win</li>
			<li>XP updates automatically as matches are completed and verified</li>
		</ul>
		<p class="text-muted mt-md">
			Integrity still matters: low integrity can restrict tournament eligibility regardless of XP.
		</p>
	</div>
	
	{#if loading}
		<div class="loading"><div class="spinner"></div></div>
	{:else if ladder.length === 0}
		<div class="empty-state card">
			<p class="text-secondary">
				No teams on the XP ladder yet. Create a clan and start earning XP.
			</p>
			<a class="btn mt-md" href="/clans">Go to Clans</a>
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
							<td class="xp-cell">
								<span class="xp">{entry.xp}</span>
							</td>
							<td class="matches-cell">
								<span class="matches">{entry.matchesPlayed}</span>
							</td>
							<td class="record-cell">
								<span class="wins">{entry.wins}W</span>
								<span class="separator">-</span>
								<span class="losses">{entry.losses}L</span>
							</td>
							<td class="lastmatch-cell">
								<span class="lastmatch">{formatLastMatch(entry.lastMatchAt)}</span>
							</td>
							<td>
								<span class="integrity-badge {getIntegrityLevel(entry.clan.integrity)}">
									{entry.clan.integrity}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="notes card mt-lg">
			<h3>Notes</h3>
			<p class="text-secondary">
				XP formulas are deliberately simple for launch and can be tuned as MicroArena grows.
				Future ladders may include skill-based rating, role-based performance, and seasonal prestige rewards.
			</p>
		</div>
	{/if}
</div>

<style>
	.page-header { margin: var(--space-xl) 0; }
	.subtitle { color: var(--text-secondary); margin-top: var(--space-xs); }
	
	.season-info {
		display: flex;
		justify-content: center;
		gap: var(--space-3xl);
		margin-bottom: var(--space-xl);
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

	@media (max-width: 768px) {
		.season-info { flex-direction: column; gap: var(--space-md); }
		table thead th:nth-child(6),
		table tbody td:nth-child(6) { display: none; }
	}
</style>
