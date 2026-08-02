<script lang="ts">
  import { LEVELS, isLevelUnlocked, type ProgressState } from '../../engine';

  let {
    progress,
    onplay,
    onback,
  }: {
    progress: ProgressState;
    onplay: (levelId: string) => void;
    onback: () => void;
  } = $props();

  const WORLD_GLYPH = ['', '➡️', '🧭', '🔁', '🧩'];

  const worlds = $derived(
    [1, 2, 3, 4].map((world) => ({
      world,
      levels: LEVELS.filter((l) => l.world === world),
    })),
  );

  const state = (id: string): 'tidy' | 'done' | 'open' | 'locked' => {
    if (progress.tidyLevels.includes(id)) return 'tidy';
    if (progress.completedLevels.includes(id)) return 'done';
    return isLevelUnlocked(progress, id) ? 'open' : 'locked';
  };

  const MARK = { tidy: '⭐', done: '✅', open: '', locked: '🔒' } as const;
</script>

<section class="bench">
  <header>
    <button type="button" class="back" onclick={onback} aria-label="back to the workshop">⬅️</button>
  </header>

  {#each worlds as { world, levels } (world)}
    <div class="world-row">
      <span class="world-glyph" aria-hidden="true">{WORLD_GLYPH[world]}</span>
      <div class="levels">
        {#each levels as level, i (level.id)}
          {@const s = state(level.id)}
          <button
            type="button"
            class="level {s}"
            disabled={s === 'locked'}
            onclick={() => onplay(level.id)}
            aria-label="world {world} level {i + 1}"
          >
            <span class="num">{i + 1}</span>
            <span class="mark" aria-hidden="true">{MARK[s]}</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</section>

<style>
  .bench {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    min-height: 100svh;
  }

  .back {
    min-width: 3.4rem;
    min-height: 3.4rem;
    border-radius: 16px;
    background: var(--card-bg);
    font-size: 1.5rem;
  }

  .world-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .world-glyph { font-size: 1.8rem; }

  .levels {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .level {
    position: relative;
    min-width: 4rem;
    min-height: 4rem;
    border-radius: 18px;
    background: var(--card-bg);
    border: 2px solid var(--border);
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-h);
  }

  .level.tidy { border-color: var(--accent); }
  .level.done { border-color: var(--good); }
  .level.locked { opacity: 0.4; }
  .level:active:not(:disabled) { transform: scale(0.94); }

  .mark {
    position: absolute;
    right: -0.3rem;
    top: -0.4rem;
    font-size: 1rem;
  }
</style>
