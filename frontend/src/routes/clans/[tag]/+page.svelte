<script lang="ts">
	export let data;

	const { clan, error } = data;
</script>

<div class="max-w-2xl mx-auto p-6 space-y-6">
	{#if error}
		<p class="text-red-400">{error}</p>
	{:else if !clan}
		<p class="opacity-70">Loading clan…</p>
	{:else}
		<h1 class="text-3xl font-bold">
			<span class="font-mono">{clan.tag}</span>
			<span class="opacity-70"> — {clan.name}</span>
		</h1>

		<div class="flex gap-6 text-sm opacity-80">
			<p>Members: {clan.members.length}</p>
			<p>Integrity: {clan.integrity}</p>
		</div>

		<hr class="border-neutral-800" />

		<section class="space-y-2">
			<h2 class="text-xl font-semibold">Members</h2>

			<ul class="space-y-1">
				{#each clan.members as member}
					<li class="font-mono">{member}</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
