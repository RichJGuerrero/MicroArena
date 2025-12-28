<script lang="ts" context="module">
	export type ComingSoonAction = {
		label: string;
		href: string;
		kind?: 'primary' | 'secondary';
	};
</script>

<script lang="ts">
	export let title: string;
	export let tagline: string = '';
	export let description: string = '';
	export let planned: string[] = [];
	export let actions: ComingSoonAction[] = [];
</script>

<div class="container narrow">
	<div class="page-header">
		<span class="coming-badge">Coming Soon</span>
		<h1>{title}</h1>
		{#if tagline}
			<p class="tagline">{tagline}</p>
		{/if}
	</div>

	<div class="card accent">
		{#if description}
			<p class="description">{description}</p>
		{/if}

		{#if planned.length > 0}
			<h3 class="section-title">What to expect</h3>
			<ul class="planned">
				{#each planned as item}
					<li>{item}</li>
				{/each}
			</ul>
		{/if}

		{#if actions.length > 0}
			<div class="actions">
				{#each actions as a}
					<a
						href={a.href}
						class={`btn sm ${a.kind === 'secondary' ? 'secondary' : ''}`.trim()}
					>
						{a.label}
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.page-header {
		margin: var(--space-xl) 0;
		text-align: center;
	}

	.coming-badge {
		display: inline-block;
		font-size: 0.6875rem;
		font-weight: 700;
		padding: 3px 10px;
		background: rgba(253, 90, 30, 0.15);
		color: var(--accent);
		border: 1px solid rgba(253, 90, 30, 0.4);
		border-radius: var(--radius-full);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-md);
	}

	h1 {
		margin-bottom: var(--space-sm);
	}

	.tagline {
		color: var(--text-secondary);
		margin-top: var(--space-xs);
	}

	.description {
		color: var(--text-secondary);
		margin-bottom: var(--space-lg);
	}

	.section-title {
		margin: var(--space-lg) 0 var(--space-sm);
		font-size: 1.05rem;
	}

	.planned {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-sm);
	}

	.planned li {
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		color: var(--text-secondary);
	}

	.actions {
		margin-top: var(--space-lg);
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}
</style>
