<script lang="ts">
  import type { Direction } from '../../engine';

  let {
    arrows,
    repeatAllowed = false,
    miniSlots = 0,
    full = false,
    running = false,
    onarrow,
    onrepeat,
    onmini,
    onplay,
    onclear,
  }: {
    arrows: Direction[];
    repeatAllowed?: boolean;
    miniSlots?: number;
    full?: boolean;
    running?: boolean;
    onarrow: (dir: Direction) => void;
    onrepeat: () => void;
    onmini: () => void;
    onplay: () => void;
    onclear: () => void;
  } = $props();

  const GLYPH: Record<Direction, string> = {
    up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️',
  };
  const ORDER: Direction[] = ['up', 'left', 'right', 'down'];
  const shown = $derived(ORDER.filter((d) => arrows.includes(d)));
</script>

<div class="pad">
  <div class="arrows">
    {#each shown as dir (dir)}
      <button
        type="button" class="key" disabled={full || running}
        onclick={() => onarrow(dir)} aria-label="add {dir}"
      >{GLYPH[dir]}</button>
    {/each}

    {#if repeatAllowed}
      <button
        type="button" class="key special" disabled={running}
        onclick={onrepeat} aria-label="add a repeat"
      >🔁</button>
    {/if}

    {#if miniSlots > 0}
      <button
        type="button" class="key special" disabled={full || running}
        onclick={onmini} aria-label="add the mini program"
      >🧩</button>
    {/if}
  </div>

  <div class="actions">
    <button
      type="button" class="clear" disabled={running}
      onclick={onclear} aria-label="clear the program"
    >🗑️</button>
    <button
      type="button" class="play" disabled={running}
      onclick={onplay} aria-label="run the program"
    >▶</button>
  </div>
</div>

<style>
  .pad {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
    width: 100%;
  }

  .arrows {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .key {
    min-width: 4.2rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--card-bg);
    box-shadow: var(--shadow);
    font-size: 2rem;
  }

  .key.special { background: var(--accent-bg); }

  .key:active:not(:disabled) { transform: scale(0.93); }
  .key:disabled { opacity: 0.35; }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .play {
    min-width: 5.5rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--accent);
    color: #1b1b23;
    font-size: 2rem;
    box-shadow: var(--shadow);
  }

  .clear {
    min-width: 4.2rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--card-bg);
    font-size: 1.6rem;
  }

  .play:active:not(:disabled), .clear:active:not(:disabled) { transform: scale(0.93); }
  .play:disabled, .clear:disabled { opacity: 0.35; }
</style>
