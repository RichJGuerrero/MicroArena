<script lang="ts">
	import { goto } from '$app/navigation';
	import { demoSignup, authError, isAuthenticated } from '$lib/auth';
	
	let username = '';
	let email = '';
	let loading = false;
	let error = '';
	
	$: if ($isAuthenticated) {
		goto('/profile');
	}
	
	async function handleSubmit() {
		error = '';
		
		if (!username.trim()) {
			error = 'Please enter a username';
			return;
		}
		if (!email.trim()) {
			error = 'Please enter your email';
			return;
		}
		
		loading = true;
		const success = await demoSignup(username.trim(), email.trim());
		loading = false;
		
		if (success) {
			goto('/profile');
		} else {
			error = $authError || 'Signup failed';
		}
	}
</script>

<svelte:head>
	<title>Sign Up — MicroArena</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-container">
		<div class="auth-card card">
			<div class="auth-header">
				<span class="auth-icon">🏟️</span>
				<h1>Join the Arena</h1>
				<p>Create your account and start competing</p>
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
						placeholder="Choose a username"
						maxlength="20"
						autocomplete="off"
						disabled={loading}
					/>
					<p class="hint">3-20 characters. Letters, numbers, underscores.</p>
				</div>
				
				<div class="form-group">
					<label for="email">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						placeholder="your@email.com"
						autocomplete="off"
						disabled={loading}
					/>
				</div>
				
				<button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Creating Account...' : 'Create Account'}
				</button>
			</form>
			
			<div class="auth-footer">
				<p>Already have an account? <a href="/login">Log in</a></p>
			</div>
		</div>
		
		<div class="auth-features">
			<h3>Start with 100 Integrity</h3>
			<p>Every player begins with a perfect integrity score. Maintain it to access premium tournaments.</p>
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
		margin-bottom: var(--space-xl);
	}
	
	.auth-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: var(--space-md);
	}
	
	.auth-header h1 { margin-bottom: var(--space-xs); }
	.auth-header p { color: var(--text-muted); }
	
	.form-group {
		margin-bottom: var(--space-lg);
	}
	.form-group label {
		display: block;
		font-weight: 500;
		margin-bottom: var(--space-xs);
	}
	.hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-top: var(--space-xs);
	}
	
	.auth-footer {
		margin-top: var(--space-lg);
		text-align: center;
		font-size: 0.9375rem;
	}
	.auth-footer p { color: var(--text-muted); }
	
	.auth-features {
		margin-top: var(--space-xl);
		text-align: center;
	}
	.auth-features h3 {
		font-size: 1rem;
		color: var(--accent);
		margin-bottom: var(--space-xs);
	}
	.auth-features p {
		font-size: 0.875rem;
		color: var(--text-muted);
	}
</style>
