<script lang="ts">
  let {
    partCount,
    onrobot,
    ongarage,
  }: {
    partCount: number;
    onrobot: () => void;
    ongarage: () => void;
  } = $props();
</script>

<section class="home">
  <h1>Cog Workshop</h1>

  <div class="benches">
    <button type="button" class="bench" onclick={onrobot} aria-label="teach the robot">
      <span class="glyph">🤖</span>
    </button>

    <button type="button" class="bench locked" disabled aria-label="lightbulb machine, locked">
      <span class="glyph">💡</span>
      <span class="lock" aria-hidden="true">🔒</span>
    </button>

    <button type="button" class="bench locked" disabled aria-label="marble machine, locked">
      <span class="glyph">⚙️</span>
      <span class="lock" aria-hidden="true">🔒</span>
    </button>
  </div>

  <button type="button" class="garage" onclick={ongarage} aria-label="my robots">
    <span class="glyph">🔧</span>
    <span class="count">{partCount}</span>
  </button>
</section>

<style>
  .home {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    min-height: 100svh;
    padding: 1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.6rem;
    color: var(--accent);
  }

  .benches {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 320px;
  }

  .bench {
    position: relative;
    width: 100%;
    min-height: 7rem;
    border-radius: 26px;
    background: var(--card-bg);
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bench .glyph { font-size: 3.4rem; }
  .bench:active:not(:disabled) { transform: scale(0.96); }
  .bench.locked { opacity: 0.45; }

  .lock {
    position: absolute;
    right: 1rem;
    font-size: 1.6rem;
  }

  .garage {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 4rem;
    padding: 0 1.5rem;
    border-radius: 20px;
    background: var(--accent-bg);
    border: 2px solid var(--accent);
  }

  .garage .glyph { font-size: 1.8rem; }
  .garage .count { font-size: 1.4rem; font-weight: 700; color: var(--accent); }
</style>
