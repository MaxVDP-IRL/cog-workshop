<script lang="ts">
  import type { Direction, Instruction } from '../../engine';

  let {
    program,
    slots,
    activePath = null,
    crashPath = null,
    onremove,
  }: {
    program: Instruction[];
    slots: number;
    activePath?: number[] | null;
    crashPath?: number[] | null;
    onremove: (index: number) => void;
  } = $props();

  const GLYPH: Record<Direction, string> = {
    up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️',
  };

  const label = (tile: Instruction): string => {
    if (tile.kind === 'move') return GLYPH[tile.dir];
    if (tile.kind === 'repeat') return `${tile.body.map((m) => GLYPH[m.dir]).join('')}×${tile.times}`;
    return '🧩';
  };

  const empties = $derived(Math.max(0, slots - program.length));
</script>

<div class="strip" role="group">
  {#each program as tile, i (i)}
    <button
      type="button"
      class="tile"
      class:active={activePath?.[0] === i}
      class:crashed={crashPath?.[0] === i}
      class:wide={tile.kind === 'repeat'}
      onclick={() => onremove(i)}
      aria-label="remove step {i + 1}"
    >
      {label(tile)}
    </button>
  {/each}

  {#each Array(empties) as _, i (i)}
    <div class="tile empty" aria-hidden="true"></div>
  {/each}
</div>

<style>
  .strip {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-start;
    width: 100%;
    min-height: 4rem;
    padding: 0.5rem;
  }

  .tile {
    min-width: 3rem;
    min-height: 3rem;
    border-radius: 14px;
    background: var(--card-bg);
    border: 2px solid var(--border);
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tile.wide {
    min-width: 4.6rem;
    font-size: 1rem;
  }

  .tile.empty {
    background: transparent;
    border-style: dashed;
    opacity: 0.4;
  }

  .tile.active {
    border-color: var(--accent);
    background: var(--accent-bg);
    transform: scale(1.08);
  }

  .tile.crashed {
    border-color: var(--crash);
    animation: pulse 0.6s ease infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.12); }
  }
</style>
