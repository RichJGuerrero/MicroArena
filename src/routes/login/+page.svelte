<script lang="ts">
	import { goto } from '$app/navigation';
	import { demoLogin, authError, isAuthenticated } from '$lib/auth';
	
	let username = '';
	let loading = false;
	let error = '';
	
	// Redirect if already authenticated
	$: if ($isAuthenticated) {
		goto('/profile');
	}
	
	async function handleSubmit() {
		error = '';
		if (!username.trim()) {
			error = 'Please enter your username';
			return;
		}
		
		loading = true;
		const success = await demoLogin(username.trim());
		loading = false;
		
		if (success) {
			goto('/profile');
		} else {
			error = $authError || 'Login failed';
		}
	}
	
	function setUsername(name: string) {
		username = name;
	}
</script>

<svelte:head>
	<title>Login — MicroArena</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-container">
		<div class="auth-card card">
			<div class="auth-header">
				<span class="auth-icon">🏟️</span>
				<h1>Welcome Back</h1>
				<p>Enter your username to continue</p>
			</div>
			
			<div class="demo-notice">
				<strong>Demo Mode:</strong> Enter any existing username to log in. 
				No password required for testing.
			</div>
			
			<form on:submit|preventDefault={handleSubmit}>
				{#if error}
					<div class="error-message">{error}</div>
				{/if}
				
				<div class="form-group">
					<label for="username">Username</label>
					<input
						type="text"
						id="username"
						bind:value={username}
						placeholder="Enter your username"
						autocomplete="off"
						disabled={loading}
					/>
				</div>
				
				<button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Logging in...' : 'Log In'}
				</button>
			</form>
			
			<div class="auth-footer">
				<p>Don't have an account? <a href="/signup">Sign up</a></p>
			</div>
		</div>
	</div>
</div>

<style>
	.auth-page {
		min-height: calc(100vh - 200px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl);
	}
	
	.auth-container {
		width: 100%;
		max-width: 420px;
	}
	
	.auth-card { padding: var(--space-xl); }
	
	.auth-header {
		text-align: center;
		margin-bottom: var(--space-lg);
	}
	
	.auth-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: var(--space-md);
	}
	
	.auth-header h1 { margin-bottom: var(--space-xs); }
	.auth-header p { color: var(--text-muted); }
	
	.demo-notice {
		background: rgba(253, 90, 30, 0.1);
		border: 1px solid rgba(253, 90, 30, 0.3);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		margin-bottom: var(--space-lg);
		font-size: 0.875rem;
		color: var(--text-secondary);
	}
	.demo-notice strong { color: var(--accent); }
	
	.form-group {
		margin-bottom: var(--space-lg);
	}
	.form-group label {
		display: block;
		font-weight: 500;
		margin-bottom: var(--space-xs);
	}
	
	.auth-footer {
		margin-top: var(--space-lg);
		text-align: center;
		font-size: 0.9375rem;
	}
	.auth-footer p { color: var(--text-muted); }
</style>
