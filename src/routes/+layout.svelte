<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { 
		isLoading, 
		isAuthenticated, 
		currentUser,
		initAuth,
		restoreDemoSession,
		login,
		logout,
		demoLogout
	} from '$lib/auth';
	import { getIntegrityLevel } from '$lib/types';
	
	onMount(async () => {
		// Check if Auth0 is configured
		const auth0Configured = import.meta.env.PUBLIC_AUTH0_DOMAIN && 
			import.meta.env.PUBLIC_AUTH0_CLIENT_ID;
		
		if (auth0Configured) {
			await initAuth();
		} else {
			// Demo mode
			await restoreDemoSession();
		}
	});
	
	function handleLogout() {
		const auth0Configured = import.meta.env.PUBLIC_AUTH0_DOMAIN && 
			import.meta.env.PUBLIC_AUTH0_CLIENT_ID;
		
		if (auth0Configured) {
			logout();
		} else {
			demoLogout();
		}
	}
	
	// Track current route for nav highlighting
	function isActive(path: string, currentPath: string): boolean {
		// Exact match for home
		if (path === '/' && currentPath === '/') return true;
		
		// For other paths, check if pathname starts with the path
		if (path !== '/') {
			return currentPath === path || currentPath.startsWith(path + '/');
		}
		
		return false;
	}

</script>

<div class="app">
	<header class="nav-header">
		<div class="container">
			<nav class="nav">
				<a href="/" class="logo">
					<span class="logo-icon">🏟️</span>
					<span class="logo-text">MicroArena</span>
				</a>
				
				<div class="nav-links">
					<a href="/beef" class:active={isActive('/beef', $page.url.pathname)}>Beef</a>
					<a href="/tournaments" class:active={isActive('/tournaments', $page.url.pathname)}>Tournaments</a>
					<a href="/clans" class:active={isActive('/clans', $page.url.pathname)}>Clans</a>
					<a href="/ladder" class:active={isActive('/ladder', $page.url.pathname)}>Ladder</a>
					<a href="/integrity" class:active={isActive('/integrity', $page.url.pathname)}>Integrity</a>
				</div>
				
				<div class="nav-user">
					{#if $isLoading}
						<div class="spinner"></div>
					{:else if $isAuthenticated && $currentUser}
						<a href="/profile" class="user-link">
							<span class="user-avatar">{$currentUser.username.charAt(0)}</span>
							<span class="user-name">{$currentUser.username}</span>
							<span class="user-integrity {getIntegrityLevel($currentUser.integrity)}">
								{$currentUser.integrity}
							</span>
						</a>
						<button class="btn ghost sm" on:click={handleLogout}>Logout</button>
					{:else}
						<a href="/login" class="btn secondary sm">Login</a>
						<a href="/signup" class="btn sm">Sign Up</a>
					{/if}
				</div>
			</nav>
		</div>
	</header>
	
	<main class="main">
		<slot />
	</main>
	
	<footer class="footer">
		<div class="container">
			<div class="footer-content">
				<div class="footer-brand">
					<span class="footer-logo">🏟️ MicroArena</span>
					<p>Integrity-First Competitive Gaming</p>
				</div>
				<div class="footer-links">
					<div class="footer-section">
						<h4>Platform</h4>
						<a href="/beef">Beef Matches</a>
						<a href="/tournaments">Tournaments</a>
						<a href="/ladder">Ladder</a>
					</div>
					<div class="footer-section">
						<h4>Community</h4>
						<a href="/clans">Clans</a>
						<a href="/integrity">Integrity</a>
					</div>
				</div>
			</div>
			<div class="footer-bottom">
				<p>© 2024 MicroArena. All rights reserved.</p>
			</div>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
	
	.nav-header {
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border);
		padding: var(--space-md) 0;
		position: sticky;
		top: 0;
		z-index: 100;
		backdrop-filter: blur(10px);
	}
	
	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-lg);
	}
	
	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-primary);
		font-weight: 800;
		font-size: 1.375rem;
	}
	.logo:hover { color: var(--text-primary); }
	
	.logo-text {
		background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	
	.nav-links {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}
	
	.nav-links a {
		color: var(--text-secondary);
		font-weight: 500;
		font-size: 0.9375rem;
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		transition: all 0.2s;
	}
	.nav-links a:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}
	.nav-links a.active {
		color: var(--accent);
		background: rgba(253, 90, 30, 0.1);
	}
	
	.nav-user {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}
	
	.user-link {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		transition: background 0.2s;
	}
	.user-link:hover { background: var(--bg-hover); }
	
	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-muted) 100%);
		color: #000;
		font-weight: 700;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		justify-content: center;
		text-transform: uppercase;
	}
	
	.user-name {
		color: var(--text-primary);
		font-weight: 500;
	}
	
	.user-integrity {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background: var(--bg-tertiary);
	}
	.user-integrity.high { color: var(--integrity-high); }
	.user-integrity.good { color: var(--integrity-good); }
	.user-integrity.medium { color: var(--integrity-medium); }
	.user-integrity.low { color: var(--integrity-low); }
	
	.main { flex: 1; }
	
	.footer {
		background: var(--bg-secondary);
		border-top: 1px solid var(--border);
		padding: var(--space-3xl) 0 var(--space-xl);
		margin-top: var(--space-3xl);
	}
	
	.footer-content {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3xl);
		margin-bottom: var(--space-2xl);
	}
	
	.footer-brand { max-width: 300px; }
	.footer-logo {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.footer-brand p {
		margin-top: var(--space-sm);
		color: var(--text-muted);
		font-size: 0.875rem;
	}
	
	.footer-links { display: flex; gap: var(--space-3xl); }
	
	.footer-section h4 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-bottom: var(--space-md);
	}
	.footer-section a {
		display: block;
		color: var(--text-secondary);
		font-size: 0.9375rem;
		padding: var(--space-xs) 0;
	}
	.footer-section a:hover { color: var(--text-primary); }
	
	.footer-bottom {
		padding-top: var(--space-xl);
		border-top: 1px solid var(--border);
		text-align: center;
	}
	.footer-bottom p {
		font-size: 0.875rem;
		color: var(--text-muted);
	}
	
	@media (max-width: 1024px) {
		.nav-links { display: none; }
		.footer-content { flex-direction: column; gap: var(--space-xl); }
	}
	
	@media (max-width: 640px) {
		.nav-user { gap: var(--space-sm); }
		.user-name { display: none; }
	}
</style>