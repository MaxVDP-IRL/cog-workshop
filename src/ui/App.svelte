<script lang="ts">
  import Home from './Home.svelte';
  import Garage from './Garage.svelte';
  import RobotBench from './robot/RobotBench.svelte';
  import RobotLevel from './robot/RobotLevel.svelte';
  import LightbulbBench from './lightbulb/LightbulbBench.svelte';
  import LightbulbMachine from './lightbulb/LightbulbMachine.svelte';
  import LightbulbCountUp from './lightbulb/LightbulbCountUp.svelte';
  import { loadProgress, saveProgress, type LoadedProgress } from '../platform/storage';
  import { speak } from '../platform/speech';
  import {
    completeLevel, completeLightbulbLevel, equippedOrDefault, levelById, lightbulbLevelById,
    nextLevelId, lightbulbNextLevelId, partById,
    type ProgressState, type Slot,
  } from '../engine';

  type Screen =
    | 'home' | 'garage'
    | 'robot-bench' | 'robot-level'
    | 'lightbulb-bench' | 'lightbulb-level' | 'lightbulb-countup';

  let progress: LoadedProgress = $state(loadProgress());
  let screen: Screen = $state('home');
  let currentLevelId: string | null = $state(null);
  let awarded: string[] = $state([]);

  const update = (next: ProgressState) => {
    progress = next;
    saveProgress(next);
  };

  const robotGlyph = $derived.by(() => {
    const head = equippedOrDefault(progress, 'head');
    return head ? partById(head).glyph : '🤖';
  });

  const openRobotLevel = (id: string) => {
    currentLevelId = id;
    screen = 'robot-level';
  };

  const openLightbulbLevel = (id: string) => {
    currentLevelId = id;
    screen = 'lightbulb-level';
  };

  /** Shows the award pop-up if anything was earned. Returns whether it did. */
  const award = (earned: string[]): boolean => {
    if (earned.length === 0) return false;
    awarded = earned;
    speak(`You earned ${earned.map((id) => partById(id).label).join(' and ')}`);
    return true;
  };

  const robotSolved = (tilesUsed: number) => {
    if (!currentLevelId) return;
    const { progress: next, earned } = completeLevel(progress, currentLevelId, tilesUsed);
    update(next);
    if (!award(earned)) goToNextRobotLevel();
  };

  const goToNextRobotLevel = () => {
    const next = currentLevelId ? nextLevelId(currentLevelId) : null;
    if (next) currentLevelId = next;
    else screen = 'robot-bench';
  };

  const lightbulbSolved = (tapsUsed: number) => {
    if (!currentLevelId) return;
    const { progress: next, earned } = completeLightbulbLevel(progress, currentLevelId, tapsUsed);
    update(next);
    if (!award(earned)) goToNextLightbulbLevel();
  };

  const goToNextLightbulbLevel = () => {
    const next = currentLevelId ? lightbulbNextLevelId(currentLevelId) : null;
    if (next) currentLevelId = next;
    else screen = 'lightbulb-bench';
  };

  const dismissAward = () => {
    awarded = [];
    if (screen === 'robot-level') goToNextRobotLevel();
    else if (screen === 'lightbulb-level') goToNextLightbulbLevel();
  };

  const equip = (slot: Slot, partId: string) => {
    update({ ...progress, equipped: { ...progress.equipped, [slot]: partId } });
  };
</script>

{#if screen === 'home'}
  <Home
    partCount={progress.parts.length}
    onrobot={() => (screen = 'robot-bench')}
    onlightbulb={() => (screen = 'lightbulb-bench')}
    ongarage={() => (screen = 'garage')}
  />
{:else if screen === 'robot-bench'}
  <RobotBench {progress} onplay={openRobotLevel} onback={() => (screen = 'home')} />
{:else if screen === 'robot-level' && currentLevelId}
  <RobotLevel
    level={levelById(currentLevelId)}
    glyph={robotGlyph}
    onsolved={robotSolved}
    onback={() => (screen = 'robot-bench')}
  />
{:else if screen === 'lightbulb-bench'}
  <LightbulbBench
    {progress}
    onplay={openLightbulbLevel}
    oncountup={() => (screen = 'lightbulb-countup')}
    onback={() => (screen = 'home')}
  />
{:else if screen === 'lightbulb-level' && currentLevelId}
  <LightbulbMachine
    level={lightbulbLevelById(currentLevelId)}
    onsolved={lightbulbSolved}
    onback={() => (screen = 'lightbulb-bench')}
  />
{:else if screen === 'lightbulb-countup'}
  <LightbulbCountUp onback={() => (screen = 'lightbulb-bench')} />
{:else if screen === 'garage'}
  <Garage {progress} onequip={equip} onback={() => (screen = 'home')} />
{/if}

{#if awarded.length > 0}
  <button type="button" class="award" onclick={dismissAward} aria-label="you earned a new part">
    <span class="burst">
      {#each awarded as id (id)}
        <span class="part">{partById(id).glyph}</span>
      {/each}
    </span>
  </button>
{/if}

<style>
  .award {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(27, 27, 35, 0.92);
    width: 100%;
  }

  .burst {
    display: flex;
    gap: 1rem;
    animation: pop 0.45s ease;
  }

  .part { font-size: 5rem; }

  @keyframes pop {
    0% { transform: scale(0.2); opacity: 0; }
    70% { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
</style>
