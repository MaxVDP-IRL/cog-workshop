<script lang="ts">
  import type { Cell, Level } from '../../engine';

  let {
    level,
    robotAt,
    crashed = false,
    glyph = '🤖',
  }: {
    level: Level;
    robotAt: Cell;
    crashed?: boolean;
    glyph?: string;
  } = $props();

  const isWall = (x: number, y: number) => level.walls.some((w) => w.x === x && w.y === y);

  const cells = $derived(
    Array.from({ length: level.width * level.height }, (_, i) => ({
      x: i % level.width,
      y: Math.floor(i / level.width),
    })),
  );
</script>

<svg
  class="grid"
  viewBox="0 0 {level.width} {level.height}"
  role="img"
  aria-label="the robot's world"
>
  {#each cells as cell (`${cell.x},${cell.y}`)}
    <rect
      x={cell.x + 0.03} y={cell.y + 0.03} width="0.94" height="0.94" rx="0.1"
      class="cell" class:wall={isWall(cell.x, cell.y)}
    />
  {/each}

  <text
    x={level.goal.x + 0.5} y={level.goal.y + 0.5}
    class="goal" text-anchor="middle" dominant-baseline="central"
  >⭐</text>

  <!--
    Position via a CSS transform on a <g>, not x/y attributes on the <text>.
    CSS transitions on SVG x/y geometry attributes are unreliable in iOS
    Safari, which is a primary target. transform is animatable everywhere.
    The shake lives on an inner <g> so it cannot fight the position transform.
  -->
  <g class="robot" style="transform: translate({robotAt.x + 0.5}px, {robotAt.y + 0.5}px)">
    <g class:crashed>
      <text class="glyph" text-anchor="middle" dominant-baseline="central">{glyph}</text>
    </g>
  </g>
</svg>

<style>
  .grid {
    width: 100%;
    height: 100%;
    max-height: 100%;
    display: block;
  }

  .cell {
    fill: var(--card-bg);
    stroke: var(--border);
    stroke-width: 0.015;
  }

  .cell.wall {
    fill: var(--border);
    stroke: none;
  }

  .goal { font-size: 0.6px; }

  .glyph { font-size: 0.7px; }

  .robot {
    /* The robot slides between cells; the trace drives one cell per tick. */
    transition: transform 0.28s ease;
  }

  .crashed {
    animation: shake 0.3s ease;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-0.08px); }
    75% { transform: translateX(0.08px); }
  }
</style>
