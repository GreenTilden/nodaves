<template>
  <router-view />
</template>

<style>
:root {
  --bg: #0a0a0f;
  --fg: #e5e5f0;
  --accent: #ffaa00;
  --muted: #888;
  --border: #333;
  --surface: #0d0d14;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--fg);
  font-family: 'Press Start 2P', 'Courier New', monospace;
  -webkit-font-smoothing: none;
}

a { color: var(--accent); }
</style>
