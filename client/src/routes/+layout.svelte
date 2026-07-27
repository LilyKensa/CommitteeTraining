<script lang="ts">
  import { Constants } from "@committee-training/shared/constants";
  
  import "./layout.css";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Bowlby+One&display=swap" rel="stylesheet">

  <meta property="og:title" content="NOT DIEP.IO" />
  <meta property="og:description" content="Perish and be shot by others while trying to keep your own tank dead!" />
  <meta property="og:type" content="website" />
  <meta name="theme-color" content={Constants.selfColor} />
</svelte:head>

<div class="app">
  {@render children()}
</div>

<style lang="postcss">
  
</style>
