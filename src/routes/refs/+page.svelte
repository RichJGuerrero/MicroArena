<svelte:head>
	<title>Refs &amp; Disputes — MicroArena</title>
</svelte:head>

<div class="container narrow">
	<div class="page-header text-center">
		<h1>🧑‍⚖️ Refs &amp; Disputes</h1>
		<p class="lead">
			MicroArena runs like GB/CMG: both sides confirm what happened. If both sides agree, the system finalizes it.
			If they don’t, it becomes a dispute.
		</p>
	</div>

	<div class="card explainer" id="ready">
		<h2>✅ Ready‑Up</h2>
		<ul class="bullets">
			<li><strong>When rosters are full</strong>, the match enters <strong>READY</strong>.</li>
			<li>Each side must press <strong>Ready Up</strong> before the timer hits zero.</li>
			<li>If <strong>one side readies</strong> and the other doesn’t, the non‑ready side <strong>forfeits</strong>.</li>
			<li>If <strong>neither side readies</strong>, the match is <strong>cancelled</strong>.</li>
		</ul>
		<p class="muted small">Why: this prevents stall tactics and keeps queues clean.</p>
	</div>

	<div class="card explainer" id="reporting">
		<h2>🏁 Result Reporting (GB/CMG‑style)</h2>
		<ul class="bullets">
			<li>After the match is LIVE, <strong>each team reports who won</strong> (Team A or Team B).</li>
			<li>If both teams report the <strong>same winner</strong>, the match becomes <strong>COMPLETED</strong>.</li>
			<li>If the reports <strong>conflict</strong> (A says A won, B says B won), the match becomes <strong>DISPUTED</strong>.</li>
		</ul>

		<div class="callout">
			<strong>Important:</strong> reporting is not “locked”. Teams can update their report if they clicked the wrong winner.
		</div>
	</div>

	<div class="card explainer" id="disputes">
		<h2>⚠️ Disputes</h2>
		<ul class="bullets">
			<li>A dispute means the two reports do not match.</li>
			<li>The fastest resolution is usually simple: <strong>one side updates their report</strong> to match the correct winner.</li>
			<li>If the dispute can’t be resolved, a <strong>ref</strong> may step in (human review, evidence, and integrity logs).</li>
		</ul>

		<div class="callout">
			<strong>Pro tip:</strong> if your opponent is clearly wrong, don’t spam reports. Submit your proof and let the process work.
		</div>
	</div>

	<div class="card explainer" id="refs">
		<h2>🧾 Refs (What to expect)</h2>
		<ul class="bullets">
			<li>Refs exist to <strong>resolve disputes</strong>, not to play judge in normal wins.</li>
			<li>When a ref decision is made, the match will show a <strong>system note</strong> explaining the resolution.</li>
			<li>Integrity penalties can apply for proven cheating, no‑shows, stalling, or dispute abuse.</li>
		</ul>
		<p class="muted small">At launch, refs are limited. The system is designed to self‑resolve most matches.</p>
	</div>
</div>

<style>
	.container.narrow { max-width: 920px; }
	.page-header { margin: 28px 0 18px; }
	.text-center { text-align: center; }
	.lead { color: rgba(255,255,255,0.78); margin-top: 6px; }

	.card.explainer { margin-bottom: 14px; }
	.explainer h2 { margin: 0 0 10px; font-size: 1.25rem; }
	.bullets { margin: 0; padding-left: 1.1rem; display: grid; gap: 10px; color: rgba(255,255,255,0.78); }
	.bullets li strong { color: rgba(255,255,255,0.95); }

	.muted { color: rgba(255,255,255,0.6); }
	.small { font-size: 12px; }

	.callout {
		margin-top: 12px;
		padding: 12px 14px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.28);
		color: rgba(255,255,255,0.85);
	}
</style>
