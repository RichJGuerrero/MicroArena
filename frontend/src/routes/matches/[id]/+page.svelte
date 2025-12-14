<script lang="ts">
  export let params;
  const matchId = params.id;
</script>

<div class="page">
  <h1>Match #{matchId}</h1>
  <p class="subtitle">
    Competitive match • Season 1
  </p>

  <div class="match-grid">
    <section class="match-card">
      <h2>Overview</h2>
      <p>
        This match represents a competitive session organized through MicroArena.
        Match results and conduct may affect player and clan integrity.
      </p>
    </section>

    <section class="match-card">
      <h2>Format</h2>
      <ul>
        <li>Game: FPS (Supports Call of Duty®)</li>
        <li>Mode: 4v4</li>
        <li>Ruleset: Competitive</li>
        <li>Map: Random (Competitive Pool)</li>
      </ul>
    </section>

    <section class="match-card">
      <h2>Teams</h2>
      <div class="teams">
        <div>
          <h3>
            <a href="/clans/tag">[TAG] Example Clan</a>
          </h3>
          <ul>
            <li><a href="/users/PlayerOne">PlayerOne</a></li>
            <li><a href="/users/PlayerTwo">PlayerTwo</a></li>
            <li><a href="/users/PlayerThree">PlayerThree</a></li>
            <li><a href="/users/PlayerFour">PlayerFour</a></li>
          </ul>
        </div>

        <div>
          <h3>
            <a href="/clans/abc">[ABC] Example Clan</a>
          </h3>
          <ul>
            <li><a href="/users/EnemyOne">EnemyOne</a></li>
            <li><a href="/users/EnemyTwo">EnemyTwo</a></li>
            <li><a href="/users/EnemyThree">EnemyThree</a></li>
            <li><a href="/users/EnemyFour">EnemyFour</a></li>
          </ul>
        </div>
      </div>
    </section>

    <section class="match-card">
      <h2>Integrity & Disputes</h2>
      <p>
        Disputes must be supported with evidence.
        Integrity outcomes are determined by human review.
      </p>
      <p class="muted">Disputes: None</p>
    </section>

    <section class="match-card">
      <h2>Status</h2>
      <p>Status: Scheduled</p>
      <p class="muted">Result: Pending</p>
    </section>
  </div>
</div>
