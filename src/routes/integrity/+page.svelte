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

	<div class="card explainer">
		<h2>How Integrity Works</h2>
		<p class="text-secondary mt-sm">
			Integrity is MicroArena’s trust score. It affects eligibility for competitive events and reflects how reliably you play within the rules.
		</p>
		<ul class="bullets mt-md">
			<li><strong>Start at 100.</strong> Penalties apply for stalling, dispute abuse, no-shows, and other integrity violations.</li>
			<li><strong>Tournament access is gated</strong> by Integrity thresholds (Open, Premier, Showcase).</li>
			<li><strong>Cheating is a permanent ban</strong>, not an Integrity point deduction.</li>
		</ul>
		<p class="text-muted mt-md">
			This system exists to protect competitors who show up, stream when required, and finish matches cleanly.
		</p>
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
	
	<div class="policy-section">
		<h2>Core Philosophy</h2>
		<div class="principles-grid">
			<div class="principle card">
				<h3>Human Refs First</h3>
				<p>Matches are verified. Integrity rules are enforced by real humans before any AI assistance.</p>
			</div>
			<div class="principle card">
				<h3>Dispute Abuse is a Violation</h3>
				<p>Bad-faith disputes waste time and undermine competition. Abuse will be penalized.</p>
			</div>
			<div class="principle card">
				<h3>Cheating is a Hard Ban</h3>
				<p>Cheating is not an Integrity penalty. It's permanent disqualification from the platform.</p>
			</div>
		</div>
	</div>
	
	<div class="penalties-section">
		<h2>Integrity Violations</h2>
		<p class="section-subtitle">Common penalties that reduce Integrity</p>
		
		<div class="penalties-grid">
			<div class="penalty card">
				<div class="penalty-header">
					<span class="penalty-name">Stalling / Refusal to Play</span>
					<span class="severity s4">Severe</span>
				</div>
				<p>Delaying matches, refusing to start, wasting time to gain advantage.</p>
				<div class="penalty-effect">Integrity impact: -15 to -35</div>
			</div>
			
			<div class="penalty card">
				<div class="penalty-header">
					<span class="penalty-name">Dispute Abuse</span>
					<span class="severity s3">High</span>
				</div>
				<p>False disputes, repeated bad-faith claims, attempting to overturn valid results.</p>
				<div class="penalty-effect">Integrity impact: -10 to -25</div>
			</div>
			
			<div class="penalty card">
				<div class="penalty-header">
					<span class="penalty-name">No-Show</span>
					<span class="severity s3">High</span>
				</div>
				<p>Missing scheduled matches without valid reason. Repeated no-shows escalate penalties.</p>
				<div class="penalty-effect">Integrity impact: -10 to -30</div>
			</div>
			
			<div class="penalty card">
				<div class="penalty-header">
					<span class="penalty-name">Toxic Conduct</span>
					<span class="severity s2">Moderate</span>
				</div>
				<p>Harassment, hate speech, threats, or behavior that creates an unsafe competitive environment.</p>
				<div class="penalty-effect">Integrity impact: -5 to -20</div>
			</div>
			
			<div class="penalty card ban">
				<div class="penalty-header">
					<span class="penalty-name">Cheating</span>
					<span class="severity s5">Permanent Ban</span>
				</div>
				<p>Any verified cheating results in permanent platform disqualification.</p>
				<div class="penalty-effect">Result: Account banned</div>
			</div>
		</div>
	</div>
	
	<div class="tiers-section">
		<h2>Tournament Eligibility</h2>
		<p class="section-subtitle">Integrity required for different tournament tiers</p>
		
		<div class="tiers-grid">
			<div class="tier-card card">
				<div class="tier-header">
					<h3>Open Tournaments</h3>
					<span class="tier-req">50+ Integrity</span>
				</div>
				<p>Entry-level competitive events. Still ref-verified and integrity enforced.</p>
			</div>
			
			<div class="tier-card card">
				<div class="tier-header">
					<h3>Premier Tournaments</h3>
					<span class="tier-req">90+ Integrity</span>
				</div>
				<p>Higher visibility and stronger opponents. Requires consistent clean play.</p>
			</div>
			
			<div class="tier-card card showcase">
				<div class="tier-header">
					<h3>Showcase Events</h3>
					<span class="tier-req">100 Integrity</span>
				</div>
				<p>The highest tier. Premium visibility, strict enforcement, and platform prestige.</p>
			</div>
		</div>
	</div>
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
		font-weight: 800;
	}
	.integrity-score.high { color: var(--integrity-high); }
	.integrity-score.good { color: var(--integrity-good); }
	.integrity-score.medium { color: var(--integrity-medium); }
	.integrity-score.low { color: var(--integrity-low); }
	
	.integrity-label {
		color: var(--text-secondary);
		font-weight: 600;
		font-size: 1.25rem;
	}
	
	.integrity-bar {
		width: 100%;
		height: 10px;
		background: var(--bg-hover);
		border-radius: 999px;
		overflow: hidden;
		margin-bottom: var(--space-md);
	}
	.integrity-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%);
	}
	.integrity-status {
		color: var(--text-secondary);
		font-size: 0.9375rem;
	}
	
	.policy-section, .penalties-section, .tiers-section {
		margin-top: var(--space-2xl);
	}
	
	.section-subtitle {
		margin-top: var(--space-xs);
		color: var(--text-secondary);
	}
	
	.principles-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-lg);
		margin-top: var(--space-lg);
	}
	.principle h3 { margin-bottom: var(--space-xs); }
	
	.penalties-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: var(--space-lg);
		margin-top: var(--space-lg);
	}
	
	.penalty-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
	}
	.penalty-name { font-weight: 700; }
	
	.severity {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.25rem 0.5rem;
		border-radius: 999px;
		background: var(--bg-hover);
		border: 1px solid var(--border);
		white-space: nowrap;
	}
	.severity.s2 { background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.35); color: #f59e0b; }
	.severity.s3 { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.35); color: #ef4444; }
	.severity.s4 { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.45); color: #ef4444; }
	.severity.s5 { background: rgba(185, 28, 28, 0.2); color: #b91c1c; }
	
	.penalty-effect {
		margin-top: var(--space-sm);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--text-muted);
	}
	.penalty.ban .penalty-effect { color: #b91c1c; font-weight: 700; }
	
	.tiers-grid { display: grid; gap: var(--space-md); margin-top: var(--space-lg); }
	.tier-card { padding: var(--space-lg); }
	.tier-card.showcase { border-color: rgba(251, 191, 36, 0.3); }
	
	.tier-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}
	.tier-req { font-family: var(--font-mono); font-size: 0.875rem; color: var(--text-muted); }

	.explainer { margin-bottom: var(--space-2xl); }
	.explainer h2 { font-size: 1.25rem; margin-bottom: var(--space-sm); }
	.bullets {
		margin: 0;
		padding-left: 1.2rem;
		display: grid;
		gap: var(--space-sm);
		color: var(--text-secondary);
	}
	.bullets li strong { color: var(--text-primary); }
</style>
