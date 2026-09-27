<script lang="ts">
  import type { MarbleCell, MarbleLevel, MarblePiece } from '../../engine';
  import { PIECE_GLYPH } from './glyphs';

  let {
    level,
    pieces,
    marbles,
    filled = [],
  }: {
    level: MarbleLevel;
    pieces: MarblePiece[];
    marbles: MarbleCell[];
    /** `"x,y"` keys of buckets that have caught a marble this run. */
    filled?: string[];
  } = $props();

  const cells = $derived(
    Array.from({ length: level.width * level.height }, (_, i) => ({
      x: i % level.width,
      y: Math.floor(i / level.width),
    })),
  );

  const isTarget = (x: number, y: number) => level.targets.some((t) => t.x === x && t.y === y);

  // Marbles sharing a cell sit side by side, so two paths meeting stay visible as two.
  const drawn = $derived.by(() => {
    const perCell = new Map<string, number>();
    for (const m of marbles) perCell.set(`${m.x},${m.y}`, (perCell.get(`${m.x},${m.y}`) ?? 0) + 1);
    const seen = new Map<string, number>();
    return marbles.map((m) => {
      const k = `${m.x},${m.y}`;
      const n = perCell.get(k)!;
      const i = seen.get(k) ?? 0;
      seen.set(k, i + 1);
      return { cx: m.x + 0.5 + (i - (n - 1) / 2) * 0.3, cy: m.y + 0.5 };
    });
  });
</script>

<svg class="grid" viewBox="0 0 {level.width} {level.height}" role="img" aria-label="the marble board">
  {#each cells as cell (`${cell.x},${cell.y}`)}
    <rect
      x={cell.x + 0.03} y={cell.y + 0.03} width="0.94" height="0.94" rx="0.1"
      class="cell"
      class:target={isTarget(cell.x, cell.y)}
      class:filled={filled.includes(`${cell.x},${cell.y}`)}
    />
  {/each}

  <circle cx={level.spawn.x + 0.5} cy={level.spawn.y + 0.5} r="0.2" class="chute" />

  {#each pieces as piece (`${piece.cell.x},${piece.cell.y}`)}
    <text
      x={piece.cell.x + 0.5} y={piece.cell.y + 0.5}
      class="piece" text-anchor="middle" dominant-baseline="central"
    >{PIECE_GLYPH[piece.kind]}</text>
  {/each}

  <!--
    Keyed by index, no transition: the whole marbles array is replaced every
    tick and a splitter turns one marble into two, so there's no stable
    identity to slide between cells — each tick is a flip-book frame.
  -->
  {#each drawn as marble, i (i)}
    <circle cx={marble.cx} cy={marble.cy} r="0.14" class="marble" />
  {/each}
</svg>

<style>
  .grid {
    width: 100%;
    height: 100%;
    display: block;
  }

  .cell {
    fill: var(--card-bg);
    stroke: var(--border);
    stroke-width: 0.015;
  }

  .cell.target {
    stroke: var(--accent);
    stroke-width: 0.05;
    stroke-dasharray: 0.08 0.06;
  }

  .cell.filled {
    fill: var(--accent-bg);
    stroke: var(--good);
    stroke-dasharray: none;
  }

  .chute {
    fill: none;
    stroke: var(--border);
    stroke-width: 0.04;
  }

  .piece { font-size: 0.6px; }

  .marble {
    fill: var(--accent);
    stroke: #1b1b23;
    stroke-width: 0.03;
  }
</style>
