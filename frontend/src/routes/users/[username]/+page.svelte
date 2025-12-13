<script lang="ts">
  export let params;
  const username = params.username;
</script>

<div class="page">
  <h1>{username}</h1>
  <p class="subtitle">
    Competitive player • Season 1
  </p>

  <div class="profile-grid">
    <section class="profile-card">
      <h2>Overview</h2>
      <p>
        This profile represents a competitive player on MicroArena.
        Performance, conduct, and integrity are tracked over time.
      </p>
    </section>

    <section class="profile-card">
      <h2>Integrity</h2>
      <p>
        Integrity reflects competitive conduct across all matches and events.
      </p>
      <p class="muted">Integrity Score: N/A</p>
    </section>

    <section class="profile-card">
      <h2>Clan</h2>
      <p>
        Clan affiliation connects players to team-based competition.
      </p>
      <p class="muted">Clan: None</p>
    </section>

    <section class="profile-card">
      <h2>Season Status</h2>
      <p>Season 1: Active</p>
      <p class="muted">
        Prestige rewards available at season end.
      </p>
    </section>
  </div>
</div>
