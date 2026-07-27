<script lang="ts">
  import { browser } from "$app/env";
  import { Constants } from "@committee-training/shared/constants";

  let { 
    onJoin, 
    respawnTime = $bindable()
  }: {
    onJoin?: (playerName: string) => void;
    respawnTime: number;
  } = $props();

  let respawnCooldown = $state(0);

  const nameStorageKey = "shooter-game-name";
  let name = $state(browser ? localStorage.getItem(nameStorageKey) ?? "" : "");

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const trimmed = name.trim();
    localStorage.setItem(nameStorageKey, trimmed);

    if (!onJoin) return;
    onJoin(trimmed);
  }

  let rcRefreshing = false;
  function refreshRC() {
    rcRefreshing = true;
    respawnCooldown = respawnTime - Date.now();
    console.log($state.snapshot(respawnCooldown));

    if (respawnCooldown < 0) {
      rcRefreshing = false;
      return;
    }
    window.requestAnimationFrame(refreshRC);
  }

  $effect(() => {
    if (respawnTime < Date.now()) return;
    if (rcRefreshing) return;
    refreshRC();
  });
</script>

<div class="menu-backdrop">
  <div class="menu-container">
    <h1 class="game-title">Not Diep.io</h1>

    <div class="menu-card">
      <form onsubmit={handleSubmit} class="space-y-5">
        <div class="space-y-2">
          <label for="player-name" class="input-label">Enter Your Name</label>
          <input
            id="player-name"
            type="text"
            bind:value={name}
            placeholder={Constants.defaultName}
            class="menu-input"
            maxlength={Constants.nameLengthLimit}
            spellcheck={false}
          />
        </div>

        <button
          type="submit"
          class="btn-join"
          disabled={respawnCooldown > 0}
          style:--progress={1 - respawnCooldown / Constants.playerRespawnTime}
        >
          {#if respawnCooldown > 0}
            {Math.ceil(respawnCooldown / 1000)}...
          {:else}
            Join Game
          {/if}
        </button>
      </form>
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "layout.css";

  .menu-backdrop {
    @apply 
      fixed inset-0 z-50 
      flex items-center justify-center 
      bg-black/75 p-4;
  }

  .menu-container {
    @apply 
      flex flex-col items-center justify-center 
      w-full max-w-md 
      text-center space-y-8;
  }

  .game-title {
    @apply 
      text-6xl sm:text-7xl font-extrabold tracking-wider
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
      bg-zinc-900/90 border 
      border-zinc-700/60 rounded-2xl p-6 sm:p-8 
      shadow-2xl backdrop-blur-xl;
  }

  .input-label {
    @apply 
      block 
      text-xs font-semibold uppercase tracking-wider text-zinc-400 text-left;
  }

  .menu-input {
    @apply 
      w-full px-4 py-3 
      bg-zinc-800/80 border border-zinc-700 rounded-xl 
      text-white placeholder-zinc-500 
      focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent 
      transition-all duration-200;
  }

  .btn-join {
    @apply 
      w-full py-3.5 px-6 rounded-xl 
      font-bold text-zinc-900 
      bg-lime-400 hover:bg-lime-300
      cursor-pointer active:scale-[0.98] 
      transition-all duration-200 
      shadow-lg shadow-lime-600/20 
      disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100;

    &:disabled {
      background: linear-gradient(
        to right,
        var(--color-lime-400) calc(var(--progress) * 100%),
        var(--color-lime-600) calc(var(--progress) * 100%)
      );
    }
  }
</style>