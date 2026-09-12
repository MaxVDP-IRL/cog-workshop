<script lang="ts">
  import { onDestroy } from 'svelte';
  import { toggle, isOn, litCount, type LightbulbLevel, type SwitchValue } from '../../engine';
  import { speak } from '../../platform/speech';

  let {
    level,
    onsolved,
    onback,
  }: {
    level: LightbulbLevel;
    onsolved: (tapsUsed: number) => void;
    onback: () => void;
  } = $props();

  let lit = $state(0);
  let taps = $state(0);
  let solved = $state(false);
  let running = $state(false);

  // Mirrors the fix already required in RobotLevel.svelte: the async
  // speak/wait/onsolved sequence below outlives this component if the child
  // navigates away mid-celebration, and Svelte tearing a component down does
  // not cancel in-flight promises or pending setTimeouts.
  let destroyed = false;
  onDestroy(() => { destroyed = true; });

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const reset = () => {
    lit = 0;
    taps = 0;
    solved = false;
    running = false;
  };

  // Starting a different level clears everything.
  $effect(() => {
    level.id;
    reset();
  });

  const flip = async (sw: SwitchValue) => {
    if (running) return;
    lit = toggle(lit, sw);
    taps += 1;

    if (lit === level.target) {
      running = true;
      solved = true;
      speak('You did it!');
      await wait(900);
      if (destroyed) return;
      onsolved(taps);
    }
  };

  const clear = () => {
    if (running) return;
    lit = 0;
    solved = false;
  };
</script>

<section class="machine">
  <header>
    <button
      type="button" class="back" disabled={running}
      onclick={onback} aria-label="back to the levels"
    >⬅️</button>
    <span class="par" aria-hidden="true">⭐ {litCount(level.target)}</span>
  </header>

  <div class="target" class:solved aria-label="target number {level.target}">
    <div class="dots" aria-hidden="true">
      {#each Array(level.target) as _, i (i)}
        <span class="dot"></span>
      {/each}
    </div>
    <span class="numeral">{level.target}</span>
  </div>

  <div class="total" aria-label="current total {lit}">
    <span class="numeral">{lit}</span>
  </div>

  <div class="switches">
    {#each level.switches as sw (sw)}
      <button
        type="button"
        class="switch"
        class:on={isOn(lit, sw)}
        disabled={running}
        onclick={() => flip(sw)}
        aria-label="switch worth {sw}, {isOn(lit, sw) ? 'on' : 'off'}"
      >
        <span class="switch-dots" aria-hidden="true">
          {#each Array(sw) as _, i (i)}
            <span class="switch-dot"></span>
          {/each}
        </span>
      </button>
    {/each}
  </div>

  <button
    type="button" class="clear" disabled={running}
    onclick={clear} aria-label="turn off every switch"
  >🗑️</button>
</section>

<style>
  .machine {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    height: 100svh;
    padding: 0.75rem;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .back {
    min-width: 3.4rem;
    min-height: 3.4rem;
    border-radius: 16px;
    background: var(--card-bg);
    font-size: 1.5rem;
  }

  .back:disabled { opacity: 0.35; }

  .par {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--accent);
  }

  .target, .total {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 0.75rem;
    border-radius: 20px;
    background: var(--card-bg);
    box-shadow: var(--shadow);
    width: 100%;
    max-width: 320px;
  }

  .target.solved { animation: cheer 0.5s ease; }

  @keyframes cheer {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .dots {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    max-width: 180px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
  }

  .numeral {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-h);
  }

  .total .numeral { color: var(--accent); font-size: 2.2rem; }

  .switches {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .switch {
    min-width: 3.6rem;
    min-height: 3.6rem;
    border-radius: 18px;
    background: var(--card-bg);
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
  }

  .switch.on { border-color: var(--accent); background: var(--accent-bg); }
  .switch:active:not(:disabled) { transform: scale(0.94); }
  .switch:disabled { opacity: 0.6; }

  .switch-dots {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3px;
  }

  .switch-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--border);
  }

  .switch.on .switch-dot { background: var(--accent); }

  .clear {
    min-width: 4.2rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--card-bg);
    font-size: 1.6rem;
  }

  .clear:disabled { opacity: 0.35; }
  .clear:active:not(:disabled) { transform: scale(0.93); }
</style>
