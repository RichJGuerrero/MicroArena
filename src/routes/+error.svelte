<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Error — MicroArena</title>
</svelte:head>

<div class="error-page">
	<div class="error-content">
		<span class="error-code">{$page.status}</span>
		<h1>{$page.error?.message || 'Something went wrong'}</h1>
		<p>The page you're looking for doesn't exist or an error occurred.</p>
		<div class="error-actions">
			<a href="/" class="btn">Go Home</a>
			<button class="btn secondary" on:click={() => history.back()}>Go Back</button>
		</div>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
		padding: var(--space-xl);
	}
	.error-content { max-width: 400px; }
	.error-code {
		font-family: var(--font-mono);
		font-size: 6rem;
		font-weight: 700;
		color: var(--accent);
		line-height: 1;
		display: block;
		margin-bottom: var(--space-md);
	}
	.error-content h1 { font-size: 1.5rem; margin-bottom: var(--space-sm); }
	.error-content p { color: var(--text-muted); margin-bottom: var(--space-xl); }
	.error-actions { display: flex; gap: var(--space-md); justify-content: center; }
</style>
