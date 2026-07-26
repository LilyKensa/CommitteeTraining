<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
</script>

<svelte:head>
  <title>{page.error?.message}</title>
</svelte:head>

<div class="menu-backdrop">
  <div class="menu-container">
    <h1 class="game-title">
      {page.status || 500}
    </h1>

    <div class="menu-card">
      <div class="space-y-6">
        <div class="space-y-2">
          <p class="error-subtitle">System Malfunction</p>
          <p class="error-message">
            {page.error?.message || "An unexpected error occurred."}
          </p>
        </div>

        <a href={resolve("/")} class="btn-home">
          Return to Home
        </a>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "layout.css";

  .menu-backdrop {
    @apply 
      min-h-screen w-full
      flex items-center justify-center 
      p-4 
      bg-zinc-950 relative;

    --strap-color: oklch(18% 0.006 285.885);
    --strap-width: 20px;
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent var(--strap-width),
      var(--strap-color) var(--strap-width),
      var(--strap-color) calc(2 * var(--strap-width))
    );
  }

  .menu-container {
    @apply 
      flex flex-col items-center justify-center 
      w-full max-w-md 
      text-center space-y-8;
  }

  .game-title {
    @apply 
      text-7xl sm:text-8xl font-extrabold tracking-wider
      text-lime-300
      drop-shadow-lg uppercase;
    --shadow-color: var(--color-lime-600);
    text-shadow: 
      0 1px 0 var(--shadow-color),
      0 2px 0 var(--shadow-color),
      0 3px 0 var(--shadow-color),
      0 4px 0 var(--shadow-color),
      0 5px 0 var(--shadow-color),
      0 6px 0 var(--shadow-color),
      0 7px 0 var(--shadow-color),
      0 8px 0 var(--shadow-color),
      0 9px 0 var(--shadow-color);
  }

  .menu-card {
    @apply 
      w-full 
      bg-zinc-900 border 
      border-zinc-700/60 rounded-2xl p-6 sm:p-8 
      shadow-2xl;
  }

  .error-subtitle {
    @apply 
      text-xs font-semibold uppercase tracking-wider text-zinc-400 text-center;
  }

  .error-message {
    @apply 
      text-lg sm:text-4xl font-medium text-zinc-200 
      py-10 text-center wrap-break-word;
  }

  .btn-home {
    @apply 
      inline-block w-full py-3.5 px-6 rounded-xl 
      font-bold text-zinc-900 
      bg-lime-400 hover:bg-lime-300
      cursor-pointer active:scale-[0.98] 
      transition-all duration-200 
      shadow-lg shadow-lime-600/20 
      text-center no-underline;
  }
</style>