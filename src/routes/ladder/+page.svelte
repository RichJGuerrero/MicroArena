<script lang="ts">
	import { onMount } from 'svelte';
	import { getIntegrityLevel } from '$lib/types';
	import type { LadderEntry } from '$lib/types';
	
	let ladder: LadderEntry[] = [];
	let loading = true;
	
	onMount(async () => {
		try {
			const res = await fetch('/api/ladder');
			if (res.ok) {
				const data = await res.json();
				ladder = data.ladder;
			}
		} catch (e) {
			console.error(e);
		}
		loading = false;
	});
</script>

<svelte:head>
	<title>Ladder — MicroArena</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>📊 Seasonal Ladder</h1>
		<p class="subtitle">Season 1 Rankings</p>
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
	</div>
	
	{#if loading}
		<div class="loading"><div class="spinner"></div></div>
	{:else if ladder.length === 0}
		<div class="empty-state card">
			<p>No teams on the ladder yet. Create a clan and start competing!</p>
		</div>
	{:else}
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th>Rank</th>
						<th>Team</th>
						<th>Rating</th>
						<th>Record</th>
						<th>Streak</th>
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
							<td class="rating-cell">
								<span class="rating">{entry.rating}</span>
							</td>
							<td class="record-cell">
								<span class="wins">{entry.wins}W</span>
								<span class="separator">-</span>
								<span class="losses">{entry.losses}L</span>
							</td>
							<td class="streak-cell">
								{#if entry.streak > 0}
									<span class="streak win">+{entry.streak}</span>
								{:else if entry.streak < 0}
									<span class="streak loss">{entry.streak}</span>
								{:else}
									<span class="streak">—</span>
								{/if}
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
	{/if}
	
	<div class="info-card card mt-lg">
		<h3>How Rankings Work</h3>
		<p>
			Teams earn rating points by winning matches. Beat higher-rated opponents for more points.
			Maintain good integrity to stay eligible for ranked competition.
		</p>
	</div>
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
	
	.loading { display: flex; justify-content: center; padding: var(--space-3xl); }
	
	.rank-cell { width: 80px; text-align: center; }
	.rank { font-size: 1.25rem; font-weight: 700; }
	.rank.top3 { font-size: 1.5rem; }
	
	.team-link { display: flex; align-items: center; gap: var(--space-sm); }
	.team-link:hover .clan-name { color: var(--text-primary); }
	.clan-name { color: var(--text-secondary); transition: color 0.2s; }
	
	.rating-cell { text-align: center; }
	.rating { font-family: var(--font-mono); font-weight: 700; color: var(--accent); }
	
	.record-cell { text-align: center; }
	.wins { color: var(--success); font-weight: 600; }
	.losses { color: var(--error); font-weight: 600; }
	.separator { color: var(--text-muted); margin: 0 2px; }
	
	.streak-cell { text-align: center; }
	.streak { font-family: var(--font-mono); font-weight: 600; }
	.streak.win { color: var(--success); }
	.streak.loss { color: var(--error); }
	
	.info-card h3 { margin-bottom: var(--space-sm); }
	.info-card { max-width: 600px; }
	
	@media (max-width: 768px) {
		.season-info { flex-direction: column; gap: var(--space-md); }
	}
</style>
