<script lang="ts">
  let username = '';
  let password = '';
  let error = '';

  async function handleSignup() {
    error = '';

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const data = await res.json();
      error = data.error || 'Signup failed';
      return;
    }

    window.location.href = `/users/${username}`;
  }
</script>

<div class="page">
  <h1>Create Account</h1>
  <p class="subtitle">Claim your MicroArena profile</p>

  <form on:submit|preventDefault={handleSignup} class="auth-form">
    <input
      placeholder="Username"
      bind:value={username}
      required
      minlength="3"
      maxlength="16"
    />

    <input
      type="password"
      placeholder="Password"
      bind:value={password}
      required
      minlength="6"
    />

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button type="submit">Create Account</button>
  </form>
</div>
