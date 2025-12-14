<script lang="ts">
	let usernameKey = '';
	let clanTag = '';
	let clanName = '';

	let message = '';

	async function createClan() {
		message = '';

		const res = await fetch('/api/clans/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				tag: clanTag,
				name: clanName,
				ownerUsernameKey: usernameKey
			})
		});

		const data = await res.json();
		message = data.error ?? 'Clan created successfully';
	}

	async function joinClan() {
		message = '';

		const res = await fetch('/api/clans/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				usernameKey,
				tag: clanTag
			})
		});

		const data = await res.json();
		message = data.error ?? 'Joined clan';
	}

	async function leaveClan() {
		message = '';

		const res = await fetch('/api/clans/leave', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				usernameKey
			})
		});

		const data = await res.json();
		message = data.error ?? 'Left clan';
	}
</script>

<div class="max-w-2xl mx-auto p-6 space-y-8">
	<h1 class="text-3xl font-bold">Clans</h1>

	<div class="space-y-2">
		<label class="block text-sm opacity-80">Your Username Key</label>
		<input
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
			bind:value={usernameKey}
			placeholder="micro"
		/>
	</div>

	<hr class="border-neutral-800" />

	<!-- Create Clan -->
	<div class="space-y-3">
		<h2 class="text-xl font-semibold">Create Clan</h2>

		<input
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
			bind:value={clanTag}
			placeholder="Clan Tag (2–5 chars)"
		/>

		<input
			class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded"
			bind:value={clanName}
			placeholder="Clan Name"
		/>

		<button
			class="px-4 py-2 bg-white text-black rounded font-semibold"
			on:click={createClan}
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
			bind:value={clanTag}
			placeholder="Clan Tag"
		/>

		<div class="flex gap-3">
			<button
				class="px-4 py-2 bg-white text-black rounded font-semibold"
				on:click={joinClan}
			>
				Join Clan
			</button>

			<button
				class="px-4 py-2 border border-neutral-600 rounded"
				on:click={leaveClan}
			>
				Leave Clan
			</button>
		</div>
	</div>

	{#if message}
		<p class="mt-4 text-sm opacity-90">{message}</p>
	{/if}
</div>
