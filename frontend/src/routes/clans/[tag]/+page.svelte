<script lang="ts">
  // In the future this will come from the backend
  export let params;

  const clanTag = params.tag.toUpperCase();
</script>

<div class="page">
  <h1>[{clanTag}] Clan Name</h1>
  <p class="subtitle">
    Competitive squad • Integrity-first • Season 1 participant
  </p>

  <div class="clan-detail">
    <section class="clan-section">
      <h2>Overview</h2>
      <p>
        This clan represents a competitive team competing on MicroArena.
        Clan reputation is shared across all members.
      </p>
    </section>

    <section class="clan-section">
      <h2>Roster</h2>
      <ul class="roster">
        <li>PlayerOne</li>
        <li>PlayerTwo</li>
        <li>PlayerThree</li>
        <li>PlayerFour</li>
      </ul>
      <p class="muted">4 / 8 members</p>
    </section>

    <section class="clan-section">
      <h2>Integrity</h2>
      <p>
        Clan Integrity reflects the collective conduct of all members.
        Access to premium events may require a high integrity score.
      </p>
      <p class="muted">Integrity Score: N/A</p>
    </section>

    <section class="clan-section">
      <h2>Season Status</h2>
      <p>Season 1: Active</p>
      <p class="muted">Prestige rewards available at season end.</p>
    </section>
  </div>
</div>
