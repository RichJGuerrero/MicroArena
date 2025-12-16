<script lang="ts">
	export let data;

	const { user, error } = data;
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">
	{#if error}
		<p class="text-red-400">{error}</p>
	{:else if !user}
		<p class="opacity-70">Loading profile…</p>
	{:else}
		<h1 class="text-3xl font-bold font-mono">
			{user.username}
		</h1>

		<hr class="border-neutral-800" />

		<section class="space-y-2">
			<h2 class="text-xl font-semibold">Profile</h2>

			{#if user.clan}
				<p>
					Clan:
					<a
						href={`/clans/${user.clan.tag.toLowerCase()}`}
						class="font-mono underline hover:opacity-80"
					>
						{user.clan.tag}
					</a>
					— {user.clan.name}
				</p>
			{:else}
				<p class="opacity-70">
					Not currently in a clan
				</p>
			{/if}
		</section>
	{/if}
</div>
