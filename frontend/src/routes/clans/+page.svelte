<script lang="ts">
	import { onMount } from 'svelte';

	// Identity
	let usernameKey = '';

	// Create Clan form state (separate)
	let createClanTag = '';
	let createClanName = '';

	// Join/Leave form state (separate)
	let joinClanTag = '';

	let message = '';

	onMount(() => {
		const stored = localStorage.getItem('usernameKey');
		if (stored) usernameKey = stored;
	});

	function requireIdentity(): boolean {
		if (!usernameKey) {
			message = 'No user identity found. Please sign up again.';
			return false;
		}
		return true;
	}

	async function createClan() {
		message = '';
		if (!requireIdentity()) return;

		const res = await fetch('/api/clans/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				tag: createClanTag,
				name: createClanName,
				ownerUsernameKey: usernameKey
			})
		});

		const data = await res.json();
		message = data.error ?? 'Clan created successfully';
	}

	async function joinClan() {
		message = '';
		if (!requireIdentity()) return;

		const res = await fetch('/api/clans/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				usernameKey,
				tag: joinClanTag
			})
		});

		const data = await res.json();
		message = data.error ?? 'Joined clan';
	}

	async function leaveClan() {
		message = '';
		if (!requireIdentity()) return;

		const res = await fetch('/api/clans/leave', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ usernameKey })
		});

		const data = await res.json();
		message = data.error ?? 'Left clan';
	}
</script>

<div class="max-w-2xl mx-auto p-6 space-y-8">
	<h1 class="text-3xl font-bold">Clans</h1>

	<p class="text-sm opacity-70">
		Signed in as: <span class="font-mono">{usernameKey || '(none)'}</span>
	</p>

	<hr class="border-neutral-800" />

	<!-- Create Clan -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Create Clan</h2>

		<input
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
			bind:value={createClanTag}
			placeholder="Clan Tag (2–5 chars)"
		/>

		<input
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
			bind:value={createClanName}
			placeholder="Clan Name"
		/>

		<button
			class="px-4 py-2 bg-white text-black rounded font-semibold"
			on:click={createClan}
			disabled={!usernameKey}
		>
			Create Clan
		</button>
	</div>

	<hr class="border-neutral-800" />

	<!-- Join / Leave -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Join / Leave Clan</h2>

		<input
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
			bind:value={joinClanTag}
			placeholder="Clan Tag"
		/>

		<div class="flex gap-3">
			<button
				class="px-4 py-2 bg-white text-black rounded font-semibold"
				on:click={joinClan}
				disabled={!usernameKey}
			>
				Join Clan
			</button>

			<button
				class="px-4 py-2 border border-neutral-600 rounded"
				on:click={leaveClan}
				disabled={!usernameKey}
			>
				Leave Clan
			</button>
		</div>
	</div>

	{#if message}
		<p class="mt-4 text-sm opacity-90">{message}</p>
	{/if}
</div>
