<script lang="ts">
	import { isAuthenticated, currentUser } from '$lib/auth';
	import { getIntegrityLevel, getIntegrityLabel } from '$lib/types';
</script>

<svelte:head>
	<title>Integrity System — MicroArena</title>
</svelte:head>

<div class="container narrow">
	<div class="page-header text-center">
		<h1>⚖️ Integrity System</h1>
		<p class="subtitle">Your reputation is your currency</p>
	</div>
	
	{#if $isAuthenticated && $currentUser}
		<div class="your-integrity card accent">
			<h3>Your Integrity</h3>
			<div class="integrity-display">
				<span class="integrity-score {getIntegrityLevel($currentUser.integrity)}">
					{$currentUser.integrity}
				</span>
				<span class="integrity-label">{getIntegrityLabel($currentUser.integrity)}</span>
			</div>
			<div class="integrity-bar">
				<div class="integrity-fill" style="width: {$currentUser.integrity}%"></div>
			</div>
			<p class="integrity-status">
				{#if $currentUser.integrity === 100}
					✓ Access to all tournament tiers including Showcase
				{:else if $currentUser.integrity >= 90}
					Premier and Open tournaments available
				{:else if $currentUser.integrity >= 50}
					Open tournaments only
				{:else}
					Tournament access restricted
				{/if}
			</p>
		</div>
	{/if}
	
	<section class="info-section">
		<h2>How It Works</h2>
		
		<div class="info-card card">
			<h3>Starting Point</h3>
			<p>Every player starts with <strong>100 integrity points</strong>. This is your baseline trust score.</p>
		</div>
		
		<div class="info-card card">
			<h3>Losing Integrity</h3>
			<p>Integrity decreases when you:</p>
			<ul class="violation-list">
				<li><span class="severity s1">-5</span> Stalling or delays</li>
				<li><span class="severity s2">-10</span> No-shows</li>
				<li><span class="severity s3">-15</span> Unsportsmanlike conduct</li>
				<li><span class="severity s4">-20</span> Dispute abuse</li>
				<li><span class="severity s5">perma ban</span> Cheating</li>
			</ul>
		</div>
		
		<div class="info-card card">
			<h3>Restoring Integrity</h3>
			<p>Complete matches without incidents to rebuild your score over time.</p>
		</div>
	</section>
	
	<section class="info-section">
		<h2>Tournament Access</h2>
		
		<div class="tiers-grid">
			<div class="tier-card card showcase">
				<div class="tier-header">
					<span class="tier-badge showcase">SHOWCASE</span>
					<span class="tier-req">100 Required</span>
				</div>
				<p>Elite tournaments. Perfect integrity only.</p>
			</div>
			
			<div class="tier-card card premier">
				<div class="tier-header">
					<span class="tier-badge premier">PREMIER</span>
					<span class="tier-req">90+ Required</span>
				</div>
				<p>High-level competitive play.</p>
			</div>
			
			<div class="tier-card card open">
				<div class="tier-header">
					<span class="tier-badge open">OPEN</span>
					<span class="tier-req">50+ Required</span>
				</div>
				<p>Entry-level tournaments.</p>
			</div>
		</div>
	</section>
	
	<section class="info-section">
		<h2>Clan Integrity</h2>
		<div class="info-card card">
			<p>Clan integrity = <strong>average of all members</strong>. One bad actor affects everyone. Choose teammates wisely.</p>
		</div>
	</section>
</div>

<style>
	.page-header { margin: var(--space-xl) 0 var(--space-2xl); }
	.subtitle { color: var(--text-secondary); margin-top: var(--space-sm); font-size: 1.125rem; }
	
	.your-integrity {
		text-align: center;
		margin-bottom: var(--space-2xl);
	}
	.your-integrity h3 {
		margin-bottom: var(--space-md);
		font-size: 0.875rem;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	
	.integrity-display {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}
	.integrity-score {
		font-family: var(--font-mono);
		font-size: 4rem;
		font-weight: 700;
		line-height: 1;
	}
	.integrity-score.high { color: var(--integrity-high); }
	.integrity-score.good { color: var(--integrity-good); }
	.integrity-score.medium { color: var(--integrity-medium); }
	.integrity-score.low { color: var(--integrity-low); }
	.integrity-label { font-size: 1.25rem; color: var(--text-muted); }
	
	.integrity-bar {
		height: 8px;
		background: var(--bg-tertiary);
		border-radius: var(--radius-full);
		overflow: hidden;
		margin-bottom: var(--space-md);
	}
	.integrity-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent) 0%, var(--integrity-high) 100%);
	}
	.integrity-status { font-size: 0.9375rem; color: var(--text-secondary); }
	
	.info-section { margin-bottom: var(--space-2xl); }
	.info-section h2 { margin-bottom: var(--space-lg); }
	.info-card { margin-bottom: var(--space-md); }
	.info-card h3 { font-size: 1.125rem; margin-bottom: var(--space-sm); }
	
	.violation-list { list-style: none; margin-top: var(--space-md); }
	.violation-list li {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--border);
	}
	.violation-list li:last-child { border-bottom: none; }
	
	.severity {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: 0.875rem;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		min-width: 50px;
		text-align: center;
	}
	.severity.s1 { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
	.severity.s2 { background: rgba(249, 115, 22, 0.2); color: #f97316; }
	.severity.s3 { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
	.severity.s4 { background: rgba(220, 38, 38, 0.2); color: #dc2626; }
	.severity.s5 { background: rgba(185, 28, 28, 0.2); color: #b91c1c; }
	
	.tiers-grid { display: grid; gap: var(--space-md); }
	.tier-card { padding: var(--space-lg); }
	.tier-card.showcase { border-color: rgba(251, 191, 36, 0.3); }
	
	.tier-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}
	.tier-req { font-family: var(--font-mono); font-size: 0.875rem; color: var(--text-muted); }
</style>
