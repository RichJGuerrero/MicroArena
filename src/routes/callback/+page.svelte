<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { initAuth, isAuthenticated } from '$lib/auth';
	
	onMount(async () => {
		await initAuth();
		// Redirect after auth is processed
		setTimeout(() => {
			goto('/profile');
		}, 100);
	});
</script>

<svelte:head>
	<title>Authenticating... — MicroArena</title>
</svelte:head>

<div class="callback-page">
	<div class="spinner"></div>
	<p>Authenticating...</p>
</div>

<style>
	.callback-page {
		min-height: 60vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-lg);
	}
	
	p {
		color: var(--text-muted);
	}
</style>
