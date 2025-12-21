import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { User, AuthUser } from '$lib/types';

// ============================================
// AUTH STATE
// ============================================
interface AuthState {
	isLoading: boolean;
	isAuthenticated: boolean;
	user: User | null;
	authUser: AuthUser | null;
	error: string | null;
}

const initialState: AuthState = {
	isLoading: true,
	isAuthenticated: false,
	user: null,
	authUser: null,
	error: null
};

export const authState = writable<AuthState>(initialState);

// Derived stores for convenience
export const isLoading = derived(authState, $state => $state.isLoading);
export const isAuthenticated = derived(authState, $state => $state.isAuthenticated);
export const currentUser = derived(authState, $state => $state.user);
export const authUser = derived(authState, $state => $state.authUser);
export const authError = derived(authState, $state => $state.error);

// ============================================
// AUTH0 CLIENT
// ============================================
let auth0Client: any = null;

async function getAuth0Client() {
	if (auth0Client) return auth0Client;
	if (!browser) return null;
	
	const { createAuth0Client } = await import('@auth0/auth0-spa-js');
	
	auth0Client = await createAuth0Client({
		domain: import.meta.env.PUBLIC_AUTH0_DOMAIN || '',
		clientId: import.meta.env.PUBLIC_AUTH0_CLIENT_ID || '',
		authorizationParams: {
			redirect_uri: typeof window !== 'undefined' ? window.location.origin + '/callback' : '',
			audience: import.meta.env.PUBLIC_AUTH0_AUDIENCE || undefined
		},
		cacheLocation: 'localstorage'
	});
	
	return auth0Client;
}

// ============================================
// AUTH FUNCTIONS
// ============================================
export async function initAuth(): Promise<void> {
	if (!browser) return;
	
	try {
		const client = await getAuth0Client();
		if (!client) {
			// Auth0 not configured, use demo mode
			authState.set({ ...initialState, isLoading: false });
			return;
		}
		
		// Handle callback if returning from Auth0
		const params = new URLSearchParams(window.location.search);
		if (params.has('code') && params.has('state')) {
			await client.handleRedirectCallback();
			window.history.replaceState({}, document.title, window.location.pathname);
		}
		
		// Check if user is authenticated
		const authenticated = await client.isAuthenticated();
		
		if (authenticated) {
			const auth0User = await client.getUser();
			
			// Sync with our backend
			const response = await fetch('/api/auth/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: auth0User.sub,
					email: auth0User.email,
					name: auth0User.name || auth0User.nickname,
					picture: auth0User.picture
				})
			});
			
			if (response.ok) {
				const { user } = await response.json();
				authState.set({
					isLoading: false,
					isAuthenticated: true,
					user,
					authUser: {
						id: auth0User.sub,
						email: auth0User.email,
						emailVerified: auth0User.email_verified,
						name: auth0User.name,
						picture: auth0User.picture,
						updatedAt: auth0User.updated_at
					},
					error: null
				});
			} else {
				throw new Error('Failed to sync user');
			}
		} else {
			authState.set({ ...initialState, isLoading: false });
		}
	} catch (error) {
		console.error('Auth init error:', error);
		authState.set({
			...initialState,
			isLoading: false,
			error: error instanceof Error ? error.message : 'Authentication failed'
		});
	}
}

export async function login(): Promise<void> {
	if (!browser) return;
	
	try {
		const client = await getAuth0Client();
		if (!client) {
			// Demo mode - redirect to demo login
			window.location.href = '/login';
			return;
		}
		
		await client.loginWithRedirect();
	} catch (error) {
		console.error('Login error:', error);
		authState.update(s => ({
			...s,
			error: error instanceof Error ? error.message : 'Login failed'
		}));
	}
}

export async function logout(): Promise<void> {
	if (!browser) return;
	
	try {
		const client = await getAuth0Client();
		
		// Clear local state
		authState.set({ ...initialState, isLoading: false });
		
		if (client) {
			await client.logout({
				logoutParams: {
					returnTo: window.location.origin
				}
			});
		}
	} catch (error) {
		console.error('Logout error:', error);
	}
}

export async function getAccessToken(): Promise<string | null> {
	if (!browser) return null;
	
	try {
		const client = await getAuth0Client();
		if (!client) return null;
		
		return await client.getTokenSilently();
	} catch (error) {
		console.error('Get token error:', error);
		return null;
	}
}

// ============================================
// DEMO MODE (when Auth0 is not configured)
// ============================================
export async function demoLogin(username: string): Promise<boolean> {
	try {
		const response = await fetch('/api/auth/demo-login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username })
		});
		
		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error || 'Login failed');
		}
		
		const { user } = await response.json();
		
		authState.set({
			isLoading: false,
			isAuthenticated: true,
			user,
			authUser: {
				id: user.id,
				email: user.email,
				emailVerified: true,
				name: user.username,
				picture: user.avatar,
				updatedAt: new Date().toISOString()
			},
			error: null
		});
		
		// Store in localStorage for persistence
		if (browser) {
			localStorage.setItem('microarena_demo_user', user.id);
		}
		
		return true;
	} catch (error) {
		authState.update(s => ({
			...s,
			error: error instanceof Error ? error.message : 'Login failed'
		}));
		return false;
	}
}

export async function demoSignup(username: string, email: string): Promise<boolean> {
	try {
		const response = await fetch('/api/auth/demo-signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, email })
		});
		
		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error || 'Signup failed');
		}
		
		const { user } = await response.json();
		
		authState.set({
			isLoading: false,
			isAuthenticated: true,
			user,
			authUser: {
				id: user.id,
				email: user.email,
				emailVerified: true,
				name: user.username,
				picture: user.avatar,
				updatedAt: new Date().toISOString()
			},
			error: null
		});
		
		if (browser) {
			localStorage.setItem('microarena_demo_user', user.id);
		}
		
		return true;
	} catch (error) {
		authState.update(s => ({
			...s,
			error: error instanceof Error ? error.message : 'Signup failed'
		}));
		return false;
	}
}

export async function restoreDemoSession(): Promise<void> {
	if (!browser) return;
	
	const userId = localStorage.getItem('microarena_demo_user');
	if (!userId) {
		authState.set({ ...initialState, isLoading: false });
		return;
	}
	
	try {
		const response = await fetch(`/api/users/${userId}`);
		if (response.ok) {
			const { user } = await response.json();
			authState.set({
				isLoading: false,
				isAuthenticated: true,
				user,
				authUser: {
					id: user.id,
					email: user.email,
					emailVerified: true,
					name: user.username,
					picture: user.avatar,
					updatedAt: new Date().toISOString()
				},
				error: null
			});
		} else {
			localStorage.removeItem('microarena_demo_user');
			authState.set({ ...initialState, isLoading: false });
		}
	} catch {
		authState.set({ ...initialState, isLoading: false });
	}
}

export function demoLogout(): void {
	if (browser) {
		localStorage.removeItem('microarena_demo_user');
	}
	authState.set({ ...initialState, isLoading: false });
}

// ============================================
// REFRESH USER DATA
// ============================================
export async function refreshUser(): Promise<void> {
	const state = get(authState);
	if (!state.user) return;
	
	try {
		const response = await fetch(`/api/users/${state.user.id}`);
		if (response.ok) {
			const { user } = await response.json();
			authState.update(s => ({ ...s, user }));
		}
	} catch (error) {
		console.error('Failed to refresh user:', error);
	}
}
