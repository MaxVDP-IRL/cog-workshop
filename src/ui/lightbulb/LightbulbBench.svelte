<script lang="ts">
  import { LIGHTBULB_LEVELS, isLightbulbLevelUnlocked, type ProgressState } from '../../engine';

  let {
    progress,
    onplay,
    oncountup,
    onback,
  }: {
    progress: ProgressState;
    onplay: (levelId: string) => void;
    oncountup: () => void;
    onback: () => void;
  } = $props();

  const STAGE_GLYPH = ['', '💡', '💡💡', '💡💡💡', '💡💡💡💡'];

  const stages = $derived(
    [1, 2, 3, 4].map((stage) => ({
      stage,
      levels: LIGHTBULB_LEVELS.filter((l) => l.stage === stage),
    })),
  );

  const state = (id: string): 'tidy' | 'done' | 'open' | 'locked' => {
    if (progress.lightbulbTidyLevels.includes(id)) return 'tidy';
    if (progress.lightbulbCompletedLevels.includes(id)) return 'done';
    return isLightbulbLevelUnlocked(progress, id) ? 'open' : 'locked';
  };

  const MARK = { tidy: '⭐', done: '✅', open: '', locked: '🔒' } as const;

  const allDone = $derived(
    LIGHTBULB_LEVELS.every((l) => progress.lightbulbCompletedLevels.includes(l.id)),
  );
</script>

<section class="bench">
  <header>
    <button type="button" class="back" onclick={onback} aria-label="back to the workshop">⬅️</button>
  </header>

  {#each stages as { stage, levels } (stage)}
    <div class="stage-row">
      <span class="stage-glyph" aria-hidden="true">{STAGE_GLYPH[stage]}</span>
      <div class="levels">
        {#each levels as level, i (level.id)}
          {@const s = state(level.id)}
          <button
            type="button"
            class="level {s}"
            disabled={s === 'locked'}
            onclick={() => onplay(level.id)}
            aria-label="stage {stage} level {i + 1}"
          >
            <span class="num">{i + 1}</span>
            <span class="mark" aria-hidden="true">{MARK[s]}</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}

  {#if allDone}
    <button type="button" class="countup" onclick={oncountup} aria-label="counting machine">
      <span class="glyph">🔢</span>
    </button>
  {/if}
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

  .stage-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .stage-glyph { font-size: 1.4rem; }

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

  .countup {
    align-self: center;
    min-width: 5rem;
    min-height: 5rem;
    border-radius: 20px;
    background: var(--accent-bg);
    border: 2px solid var(--accent);
    margin-top: 0.5rem;
  }

  .countup:active { transform: scale(0.94); }
  .countup .glyph { font-size: 2rem; }
</style>
