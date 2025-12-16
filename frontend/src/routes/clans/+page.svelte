<script lang="ts">
	import { onMount } from 'svelte';

	let usernameKey = '';

	// Create form
	let createClanTag = '';
	let createClanName = '';

	// Join form
	let joinClanTag = '';

	// State
	let message = '';
	let currentClan: null | { tag: string; name: string; members: string[] } = null;

	onMount(async () => {
		const stored = localStorage.getItem('usernameKey');
		if (!stored) {
			message = 'No user identity found. Please sign up again.';
			return;
		}

		usernameKey = stored;

		const res = await fetch(`/api/clans/me?usernameKey=${usernameKey}`);
		const data = await res.json();
		currentClan = data.clan;
	});

	async function createClan() {
		message = '';

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
		if (data.error) {
			message = data.error;
			return;
		}

		message = 'Clan created successfully';
		await refreshClan();
	}

	async function joinClan() {
		message = '';

		const res = await fetch('/api/clans/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				usernameKey,
				tag: joinClanTag
			})
		});

		const data = await res.json();
		if (data.error) {
			message = data.error;
			return;
		}

		message = 'Joined clan';
		await refreshClan();
	}

	async function leaveClan() {
		message = '';

		const res = await fetch('/api/clans/leave', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ usernameKey })
		});

		const data = await res.json();
		if (data.error) {
			message = data.error;
			return;
		}

		message = 'Left clan';
		currentClan = null;
	}

	async function refreshClan() {
		const res = await fetch(`/api/clans/me?usernameKey=${usernameKey}`);
		const data = await res.json();
		currentClan = data.clan;
	}
</script>

<div class="max-w-2xl mx-auto p-6 space-y-8">
	<h1 class="text-3xl font-bold">Clans</h1>

	<p class="text-sm opacity-70">
		Signed in as: <span class="font-mono">{usernameKey}</span>
	</p>

	{#if currentClan}
		<div class="p-4 border border-neutral-700 rounded">
			<p class="font-semibold">
				You are in clan:
				<a
	href={`/clans/${currentClan.tag.toLowerCase()}`}
	class="font-mono underline hover:opacity-80"
>
	{currentClan.tag}
</a>
 — {currentClan.name}

			</p>
			<p class="text-sm opacity-70">
				Members: {currentClan.members.length}
			</p>
		</div>
	{/if}

	<hr class="border-neutral-800" />

	<!-- Create Clan -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Create Clan</h2>

		<input
			bind:value={createClanTag}
			placeholder="Clan Tag"
			disabled={!!currentClan}
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
		/>

		<input
			bind:value={createClanName}
			placeholder="Clan Name"
			disabled={!!currentClan}
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
		/>

		<button
			on:click={createClan}
			disabled={!!currentClan}
			class="px-4 py-2 bg-white text-black rounded font-semibold disabled:opacity-50"
		>
			Create Clan
		</button>
	</div>

	<hr class="border-neutral-800" />

	<!-- Join / Leave -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Join / Leave Clan</h2>

		<input
			bind:value={joinClanTag}
			placeholder="Clan Tag"
			disabled={!!currentClan}
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
		/>

		<div class="flex gap-3">
			<button
				on:click={joinClan}
				disabled={!!currentClan}
				class="px-4 py-2 bg-white text-black rounded font-semibold disabled:opacity-50"
			>
				Join Clan
			</button>

			<button
				on:click={leaveClan}
				disabled={!currentClan}
				class="px-4 py-2 border border-neutral-600 rounded disabled:opacity-50"
			>
				Leave Clan
			</button>
		</div>
	</div>

	{#if message}
		<p class="mt-4 text-sm opacity-90">{message}</p>
	{/if}
</div>
