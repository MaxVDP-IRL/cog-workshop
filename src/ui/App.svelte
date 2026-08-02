<script lang="ts">
  import Home from './Home.svelte';
  import Garage from './Garage.svelte';
  import RobotBench from './robot/RobotBench.svelte';
  import RobotLevel from './robot/RobotLevel.svelte';
  import { loadProgress, saveProgress, type LoadedProgress } from '../platform/storage';
  import { speak } from '../platform/speech';
  import {
    completeLevel, equippedOrDefault, levelById, nextLevelId, partById,
    type ProgressState, type Slot,
  } from '../engine';

  type Screen = 'home' | 'bench' | 'level' | 'garage';

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

  const openLevel = (id: string) => {
    currentLevelId = id;
    screen = 'level';
  };

  const solved = (tilesUsed: number) => {
    if (!currentLevelId) return;
    const { progress: next, earned } = completeLevel(progress, currentLevelId, tilesUsed);
    update(next);

    if (earned.length > 0) {
      awarded = earned;
      speak(`You earned ${earned.map((id) => partById(id).label).join(' and ')}`);
    } else {
      goToNextLevel();
    }
  };

  const goToNextLevel = () => {
    const next = currentLevelId ? nextLevelId(currentLevelId) : null;
    if (next) currentLevelId = next;
    else screen = 'bench';
  };

  const dismissAward = () => {
    awarded = [];
    goToNextLevel();
  };

  const equip = (slot: Slot, partId: string) => {
    update({ ...progress, equipped: { ...progress.equipped, [slot]: partId } });
  };
</script>

{#if screen === 'home'}
  <Home
    partCount={progress.parts.length}
    onrobot={() => (screen = 'bench')}
    ongarage={() => (screen = 'garage')}
  />
{:else if screen === 'bench'}
  <RobotBench {progress} onplay={openLevel} onback={() => (screen = 'home')} />
{:else if screen === 'level' && currentLevelId}
  <RobotLevel
    level={levelById(currentLevelId)}
    glyph={robotGlyph}
    onsolved={solved}
    onback={() => (screen = 'bench')}
  />
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
