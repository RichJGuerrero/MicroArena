<script lang="ts">
	import { isAuthenticated, currentUser } from '$lib/auth';
</script>

<svelte:head>
	<title>MicroArena — Integrity-First Competitive Gaming</title>
</svelte:head>

<section class="hero">
	<div class="hero-bg"></div>
	<div class="container">
		<div class="hero-content">
			<div class="hero-badge">
				<span class="pulse-dot"></span>
				Season 1 Now Live
			</div>
			<h1>Where <span class="text-accent">Integrity</span><br/>Meets Competition</h1>
			<p class="hero-subtitle">
				The competitive gaming platform built on trust. 
				Create your legacy through fair play, not exploits.
			</p>
			<div class="hero-actions">
				{#if !$isAuthenticated}
					<a href="/signup" class="btn lg">Get Started</a>
					<a href="/integrity" class="btn secondary lg">Learn About Integrity</a>
				{:else}
					<a href="/beef" class="btn lg">Start a Beef Match</a>
					<a href="/tournaments" class="btn secondary lg">Browse Tournaments</a>
				{/if}
			</div>
		</div>
	</div>
</section>

<section class="features section">
	<div class="container">
		<div class="section-header text-center">
			<h2>Built for <span class="text-accent">Real</span> Competitors</h2>
			<p class="subtitle">Everything you need to compete at the highest level</p>
		</div>
		
		<div class="features-grid">
			<div class="feature-card card">
				<div class="feature-icon">🥊</div>
				<h3>Beef Matches</h3>
				<p>Challenge any clan to a direct showdown. Set the rules, schedule the match, and settle it.</p>
				<a href="/beef" class="feature-link">Start a Beef →</a>
			</div>
			
			<div class="feature-card card">
				<div class="feature-icon">🏆</div>
				<h3>Showcase Tournaments</h3>
				<p>Premium tournaments exclusive to teams with perfect integrity. Prove you're the best.</p>
				<a href="/tournaments" class="feature-link">View Tournaments →</a>
			</div>
			
			<div class="feature-card card">
				<div class="feature-icon">⚖️</div>
				<h3>Integrity System</h3>
				<p>Your reputation matters. Build trust through fair play and unlock premium competition.</p>
				<a href="/integrity" class="feature-link">Learn More →</a>
			</div>
			
			<div class="feature-card card">
				<div class="feature-icon">📊</div>
				<h3>Seasonal Ladder</h3>
				<p>Climb the ranks and prove your dominance. Track your progress throughout the season.</p>
				<a href="/ladder" class="feature-link">View Ladder →</a>
			</div>
		</div>
	</div>
</section>

<section class="cta section">
	<div class="container">
		<div class="cta-content text-center">
			<h2>Ready to Compete?</h2>
			<p class="subtitle">Join the arena where fair play wins.</p>
			{#if !$isAuthenticated}
				<a href="/signup" class="btn lg">Create Your Account</a>
			{:else}
				<a href="/clans" class="btn lg">Find a Clan</a>
			{/if}
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		padding: var(--space-3xl) 0;
		min-height: 70vh;
		display: flex;
		align-items: center;
	}
	
	.hero-bg {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at 30% 20%, rgba(253, 90, 30, 0.15) 0%, transparent 50%);
	}
	
	.hero-content {
		position: relative;
		max-width: 700px;
	}
	
	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-md);
		background: rgba(253, 90, 30, 0.1);
		border: 1px solid rgba(253, 90, 30, 0.3);
		border-radius: var(--radius-full);
		font-size: 0.875rem;
		color: var(--accent);
		margin-bottom: var(--space-lg);
	}
	
	.pulse-dot {
		width: 8px;
		height: 8px;
		background: var(--accent);
		border-radius: 50%;
		animation: pulse 2s infinite;
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	
	.hero h1 {
		font-size: 3.5rem;
		font-weight: 800;
		line-height: 1.1;
		margin-bottom: var(--space-lg);
	}
	
	.hero-subtitle {
		font-size: 1.25rem;
		color: var(--text-secondary);
		margin-bottom: var(--space-xl);
	}
	
	.hero-actions {
		display: flex;
		gap: var(--space-md);
	}
	
	.section-header {
		margin-bottom: var(--space-2xl);
	}
	.section-header .subtitle {
		color: var(--text-secondary);
		font-size: 1.125rem;
		margin-top: var(--space-sm);
	}
	
	.features-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-lg);
	}
	
	.feature-card {
		padding: var(--space-xl);
	}
	.feature-card:hover { border-color: var(--accent); }
	
	.feature-icon {
		font-size: 2rem;
		margin-bottom: var(--space-md);
	}
	
	.feature-card h3 { margin-bottom: var(--space-sm); }
	.feature-card p {
		margin-bottom: var(--space-md);
		font-size: 0.9375rem;
	}
	
	.feature-link {
		font-weight: 600;
		font-size: 0.875rem;
	}
	
	.cta-content {
		max-width: 500px;
		margin: 0 auto;
	}
	.cta-content .subtitle {
		color: var(--text-secondary);
		margin: var(--space-sm) 0 var(--space-lg);
	}
	
	@media (max-width: 768px) {
		.hero h1 { font-size: 2.5rem; }
		.features-grid { grid-template-columns: 1fr; }
		.hero-actions { flex-direction: column; }
	}
</style>
