<script lang="ts">
  import { SLOTS, partById, partsInSlot, equippedOrDefault, type ProgressState, type Slot } from '../engine';
  import { speak } from '../platform/speech';

  let {
    progress,
    onequip,
    onback,
  }: {
    progress: ProgressState;
    onequip: (slot: Slot, partId: string) => void;
    onback: () => void;
  } = $props();

  const owned = (slot: Slot) => partsInSlot(slot).filter((p) => progress.parts.includes(p.id));

  const equip = (slot: Slot, partId: string) => {
    onequip(slot, partId);
    speak(partById(partId).label);
  };

  const assembled = $derived(
    SLOTS.map((slot) => equippedOrDefault(progress, slot)).filter((id): id is string => id !== null),
  );
</script>

<section class="garage">
  <header>
    <button type="button" class="back" onclick={onback} aria-label="back to the workshop">⬅️</button>
  </header>

  <div class="robot" aria-label="your robot">
    {#if assembled.length === 0}
      <span class="empty" aria-hidden="true">🔩</span>
    {:else}
      {#each assembled as id (id)}
        <span class="worn">{partById(id).glyph}</span>
      {/each}
    {/if}
  </div>

  <div class="shelves">
    {#each SLOTS as slot (slot)}
      {@const parts = owned(slot)}
      {#if parts.length > 0}
        <div class="shelf">
          {#each parts as part (part.id)}
            <button
              type="button"
              class="part"
              class:on={equippedOrDefault(progress, slot) === part.id}
              onclick={() => equip(slot, part.id)}
              aria-label={part.label}
            >{part.glyph}</button>
          {/each}
        </div>
      {/if}
    {/each}
  </div>
</section>

<style>
  .garage {
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

  .robot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    min-height: 12rem;
    justify-content: center;
    background: var(--card-bg);
    border-radius: 26px;
    box-shadow: var(--shadow);
  }

  .worn { font-size: 2.6rem; line-height: 1; }
  .empty { font-size: 3rem; opacity: 0.4; }

  .shelves { display: flex; flex-direction: column; gap: 0.6rem; }

  .shelf {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .part {
    min-width: 4rem;
    min-height: 4rem;
    border-radius: 18px;
    background: var(--card-bg);
    border: 2px solid var(--border);
    font-size: 2rem;
  }

  .part.on { border-color: var(--accent); background: var(--accent-bg); }
  .part:active { transform: scale(0.94); }
</style>
