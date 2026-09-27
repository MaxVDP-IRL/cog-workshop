<script lang="ts">
  import { onDestroy } from 'svelte';
  import MarbleGrid from './MarbleGrid.svelte';
  import { PIECE_GLYPH, PIECE_NAME } from './glyphs';
  import {
    runMarble, marblePar,
    type MarbleCell, type MarbleLevel, type MarblePiece, type MarblePieceKind,
  } from '../../engine';
  import { speak } from '../../platform/speech';

  let {
    level,
    onsolved,
    onback,
  }: {
    level: MarbleLevel;
    onsolved: (piecesUsed: number) => void;
    onback: () => void;
  } = $props();

  const STEP_MS = 450;

  let pieces: MarblePiece[] = $state([]);
  let selected: MarblePieceKind | null = $state(null);
  // svelte-ignore state_referenced_locally -- intentional one-time capture;
  // level switches are handled explicitly by the $effect/reset() below.
  let marbles: MarbleCell[] = $state([{ ...level.spawn }]);
  let filled: string[] = $state([]);
  let running = $state(false);
  let solved = $state(false);
  let nudge = $state(false);

  // play()'s async speak/wait/onsolved tail outlives this component if the
  // child navigates away mid-run, and Svelte does not cancel in-flight
  // promises or pending setTimeouts on teardown.
  let destroyed = false;
  onDestroy(() => { destroyed = true; });

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const key = (c: MarbleCell) => `${c.x},${c.y}`;

  const reset = () => {
    pieces = [];
    selected = null;
    marbles = [{ ...level.spawn }];
    filled = [];
    running = false;
    solved = false;
  };

  // Starting a different level clears everything.
  $effect(() => {
    level.id;
    reset();
  });

  const kinds = $derived<MarblePieceKind[]>([...level.palette, 'bucket']);
  const full = $derived(pieces.length >= level.slots);

  const pick = (kind: MarblePieceKind) => {
    if (running) return;
    selected = selected === kind ? null : kind;
  };

  /**
   * Tapping a cell holding the selected kind removes it; tapping a cell
   * holding a different piece swaps it for the selected one.
   */
  const tapCell = async (x: number, y: number) => {
    if (running) return;
    filled = [];
    const existing = pieces.find((p) => p.cell.x === x && p.cell.y === y);
    const rest = pieces.filter((p) => p !== existing);

    if (existing && (!selected || existing.kind === selected)) {
      pieces = rest;
      return;
    }
    if (!selected) {
      nudge = true;
      await wait(450);
      if (destroyed) return;
      nudge = false;
      return;
    }
    if (!existing && full) return;
    pieces = [...rest, { cell: { x, y }, kind: selected }];
  };

  const clear = () => {
    if (running) return;
    pieces = [];
    filled = [];
    marbles = [{ ...level.spawn }];
  };

  const play = async () => {
    if (running || pieces.length === 0) return;
    running = true;
    filled = [];
    marbles = [{ ...level.spawn }];
    await wait(150);
    if (destroyed) return;

    const trace = runMarble(level, pieces);
    const buckets = new Set(pieces.filter((p) => p.kind === 'bucket').map((p) => key(p.cell)));

    for (const tick of trace.ticks) {
      marbles = tick.marbles;
      const landed = tick.marbles.map(key).filter((k) => buckets.has(k) && !filled.includes(k));
      if (landed.length > 0) filled = [...filled, ...new Set(landed)];
      await wait(STEP_MS);
      if (destroyed) return;
    }

    const won = level.targets.every((t) => (trace.caught[key(t)] ?? 0) > 0);

    if (won) {
      solved = true;
      speak('You did it!');
      await wait(900);
      if (destroyed) return;
      onsolved(pieces.length);
    } else {
      speak('Not quite. Try moving a piece.');
      await wait(700);
      if (destroyed) return;
      marbles = [{ ...level.spawn }];
      running = false;
    }
  };
</script>

<section class="machine">
  <header>
    <button
      type="button" class="back" disabled={running}
      onclick={onback} aria-label="back to the levels"
    >⬅️</button>
    <span class="slots" aria-label="{level.slots - pieces.length} pieces left">
      {#each Array(level.slots) as _, i (i)}
        <span class="dot" class:used={i < pieces.length}></span>
      {/each}
    </span>
    <span class="par" aria-hidden="true">⭐ {marblePar(level)}</span>
  </header>

  <div class="stage">
    <div
      class="board"
      class:solved
      style="aspect-ratio: {level.width} / {level.height}; width: min(100cqw, 420px, calc(100cqh * {level.width / level.height}));"
    >
      <MarbleGrid {level} {pieces} {marbles} {filled} />
      <div
        class="taps"
        style="grid-template-columns: repeat({level.width}, 1fr); grid-template-rows: repeat({level.height}, 1fr);"
      >
        {#each Array(level.width * level.height) as _, i (i)}
          {@const x = i % level.width}
          {@const y = Math.floor(i / level.width)}
          <button
            type="button"
            class="cell-hit"
            disabled={running}
            onclick={() => tapCell(x, y)}
            aria-label="row {y + 1} column {x + 1}"
          ></button>
        {/each}
      </div>
    </div>
  </div>

  <div class="palette" class:nudge>
    {#each kinds as kind (kind)}
      <button
        type="button"
        class="piece-btn"
        class:on={selected === kind}
        disabled={running}
        aria-pressed={selected === kind}
        onclick={() => pick(kind)}
        aria-label={PIECE_NAME[kind]}
      >{PIECE_GLYPH[kind]}</button>
    {/each}
  </div>

  <div class="actions">
    <button
      type="button" class="clear" disabled={running || pieces.length === 0}
      onclick={clear} aria-label="clear the board"
    >🗑️</button>
    <button
      type="button" class="play" disabled={running || pieces.length === 0}
      onclick={play} aria-label="drop the marble"
    >▶</button>
  </div>
</section>

<style>
  .machine {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    height: 100svh;
    padding: 0.5rem 0.5rem 1rem;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.5rem;
  }

  .back {
    min-width: 3.4rem;
    min-height: 3.4rem;
    border-radius: 16px;
    background: var(--card-bg);
    font-size: 1.5rem;
  }

  .back:disabled { opacity: 0.35; }

  .slots {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3rem;
  }

  .dot {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    border: 2px solid var(--accent);
  }

  .dot.used { background: var(--accent); }

  .par {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--accent);
  }

  .stage {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    container-type: size;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .board { position: relative; }

  .board.solved { animation: cheer 0.5s ease; }

  @keyframes cheer {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .taps {
    position: absolute;
    inset: 0;
    display: grid;
  }

  .cell-hit {
    background: transparent;
    border: none;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .cell-hit:active:not(:disabled) { background: rgba(245, 165, 36, 0.18); }

  .palette {
    display: flex;
    gap: 0.6rem;
    justify-content: center;
  }

  .palette.nudge { animation: wiggle 0.45s ease; }

  @keyframes wiggle {
    0%, 100% { transform: translateY(0); }
    30% { transform: translateY(-8px); }
    60% { transform: translateY(3px); }
  }

  .piece-btn {
    min-width: 4rem;
    min-height: 4rem;
    border-radius: 18px;
    background: var(--card-bg);
    border: 3px solid var(--border);
    font-size: 1.9rem;
  }

  .piece-btn.on {
    border-color: var(--accent);
    background: var(--accent-bg);
    transform: scale(1.08);
  }

  .piece-btn:active:not(:disabled) { transform: scale(0.94); }
  .piece-btn:disabled { opacity: 0.4; }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .clear {
    min-width: 4.2rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--card-bg);
    font-size: 1.6rem;
  }

  .clear:disabled { opacity: 0.35; }
  .clear:active:not(:disabled) { transform: scale(0.93); }

  .play {
    min-width: 5.5rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--accent);
    color: #1b1b23;
    font-size: 2rem;
    box-shadow: var(--shadow);
  }

  .play:disabled { opacity: 0.35; }
  .play:active:not(:disabled) { transform: scale(0.93); }
</style>
