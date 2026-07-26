<!-- client/src/routes/Input.svelte -->
<script lang="ts">
  import { fly } from "svelte/transition";

  let {
    motion = $bindable({ x: 0, y: 0 }),
    look = $bindable(0),
    clicking = $bindable(false),
    autofire = $bindable(false)
  } = $props();

  let show = $state(false);

  let keys = {
    w: false,
    a: false,
    s: false,
    d: false
  } as Record<string, boolean>;

  // Keyboard handlers
  function handleKeyDown(ev: KeyboardEvent) {
    const key = ev.key.toLowerCase();
    if (key in keys) {
      keys[key] = true;
      updateMotion();
    }

    switch (key) {
      case "k": {
        show = !show;
        break;
      }
      case "e": {
        autofire = !autofire;
        break;
      }
    }
  }

  function handleKeyUp(ev: KeyboardEvent) {
    const key = ev.key.toLowerCase();
    if (key in keys) {
      keys[key] = false;
      updateMotion();
    }
  }

  function updateMotion() {
    motion.x = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    motion.y = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
  }

  function handleMouseMove(ev: MouseEvent) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    look = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
  }

  function handleMouseDown() {
    clicking = true;
  }

  function handleMouseUp() {
    clicking = false;
  }
</script>

<svelte:window 
  onkeydown={handleKeyDown} 
  onkeyup={handleKeyUp} 
  onmousemove={handleMouseMove}
  onmousedown={handleMouseDown}
  onmouseup={handleMouseUp}
/>

{#if show}
  <aside transition:fly={{ duration: 200, y: 20 }}>
    <h2>Input</h2>
    <p><strong>Motion (WASD):</strong> X: {motion.x}, Y: {motion.y}</p>
    <p><strong>Look Angle (Rad):</strong> {look.toFixed(2)}</p>
    <p><strong>Clicking:</strong> {clicking ? "Down" : "Up"}</p>
    <p><strong>Auto Fire:</strong> {autofire ? "Yes" : "No"}</p>
  </aside>
{/if}

<style lang="postcss">
  @reference "layout.css";

  aside {
    @apply absolute px-6 py-4;

    h2 {
      @apply text-3xl font-bold;
    }
  }
</style>