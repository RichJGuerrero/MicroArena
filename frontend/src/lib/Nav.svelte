<script>
  const links = [
  { name: "Home", href: "/" },
  { name: "Arena", href: "/arena" },
  { name: "Clans", href: "/clans" },
  { name: "Integrity", href: "/integrity" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Login", href: "/login" },
  { name: "Signup", href: "/signup" }
];

</script>

<nav class="nav">
  {#each links as link}
    <a class="nav-item" href={link.href}>{link.name}</a>
  {/each}
</nav>

<style>
  .nav {
    display: flex;
    gap: 1.5rem;
    padding: 1rem;
    justify-content: center;
    background: #111;
  }
  .nav-item {
    color: white;
    font-size: 1.1rem;
    text-decoration: none;
    opacity: 0.85;
  }
  .nav-item:hover {
    opacity: 1;
  }
</style>
