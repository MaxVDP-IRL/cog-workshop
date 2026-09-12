<script lang="ts">
  import { isOn, nextCount, SWITCH_VALUES } from '../../engine';
  import { speak } from '../../platform/speech';

  let { onback }: { onback: () => void } = $props();

  let lit = $state(0);

  const bump = () => {
    lit = nextCount(lit);
    speak(String(lit));
  };
</script>

<section class="countup">
  <header>
    <button type="button" class="back" onclick={onback} aria-label="back to the lightbulb machine">⬅️</button>
  </header>

  <div class="total" aria-label="current total {lit}">
    <span class="numeral">{lit}</span>
  </div>

  <div class="switches" aria-hidden="true">
    {#each SWITCH_VALUES as sw (sw)}
      <div class="switch" class:on={isOn(lit, sw)}>
        <span class="switch-dots">
          {#each Array(sw) as _, i (i)}
            <span class="switch-dot"></span>
          {/each}
        </span>
      </div>
    {/each}
  </div>

  <button type="button" class="plus" onclick={bump} aria-label="add one">+1</button>
</section>

<style>
  .countup {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    height: 100svh;
    padding: 0.75rem;
    justify-content: center;
  }

  header {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
  }

  .back {
    min-width: 3.4rem;
    min-height: 3.4rem;
    border-radius: 16px;
    background: var(--card-bg);
    font-size: 1.5rem;
  }

  .total {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 2rem;
    border-radius: 20px;
    background: var(--card-bg);
    box-shadow: var(--shadow);
  }

  .numeral {
    font-size: 2.8rem;
    font-weight: 700;
    color: var(--accent);
  }

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

  .plus {
    min-width: 6rem;
    min-height: 5rem;
    border-radius: 24px;
    background: var(--accent);
    color: #1b1b23;
    font-size: 2rem;
    font-weight: 700;
    box-shadow: var(--shadow);
  }

  .plus:active { transform: scale(0.94); }
</style>
