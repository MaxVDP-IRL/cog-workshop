<script lang="ts">
  import { onDestroy } from 'svelte';
  import GridWorld from './GridWorld.svelte';
  import ProgramStrip from './ProgramStrip.svelte';
  import ArrowPad from './ArrowPad.svelte';
  import { run, par, type Cell, type Direction, type Instruction, type Level, type MoveInstruction } from '../../engine';
  import { speak } from '../../platform/speech';

  let {
    level,
    glyph = '🤖',
    onsolved,
    onback,
  }: {
    level: Level;
    glyph?: string;
    onsolved: (tilesUsed: number) => void;
    onback: () => void;
  } = $props();

  const STEP_MS = 320;

  let program: Instruction[] = $state([]);
  let mini: MoveInstruction[] = $state([]);
  let editingMini = $state(false);
  // svelte-ignore state_referenced_locally -- intentional one-time capture;
  // level switches are handled explicitly by the $effect/reset() below.
  let robotAt: Cell = $state({ ...level.start });
  let activePath: number[] | null = $state(null);
  let crashPath: number[] | null = $state(null);
  let running = $state(false);
  let solved = $state(false);

  // play()'s tail (the post-goal speak/wait/onsolved sequence) is async and
  // outlives this component if the child navigates away mid-animation —
  // Svelte tearing down the component does not cancel in-flight promises or
  // pending setTimeouts. Guard every resumption point so a torn-down
  // instance's pending work becomes a no-op instead of mutating state or
  // firing callbacks meant for whatever is mounted now.
  let destroyed = false;
  onDestroy(() => { destroyed = true; });

  const full = $derived(
    editingMini ? mini.length >= level.miniSlots : program.length >= level.slots,
  );

  const reset = () => {
    program = [];
    mini = [];
    editingMini = false;
    robotAt = { ...level.start };
    activePath = null;
    crashPath = null;
    running = false;
    solved = false;
  };

  // Starting a different level clears everything.
  $effect(() => {
    level.id;
    reset();
  });

  const addArrow = (dir: Direction) => {
    if (running) return;
    crashPath = null;
    if (editingMini) {
      if (mini.length < level.miniSlots) mini = [...mini, { kind: 'move', dir }];
    } else if (program.length < level.slots) {
      program = [...program, { kind: 'move', dir }];
    }
  };

  /**
   * Wrap the last one or two moves already in the strip into a repeat, or
   * bump an existing repeat's count. Wrapping two moves (rather than one)
   * happens only when the last two tiles are both plain, not-yet-repeated
   * moves — this is what lets a "zigzag" body like [right, up] be built,
   * without ever needing a modal dial.
   */
  const addRepeat = () => {
    if (running || editingMini || program.length === 0) return;
    crashPath = null;
    const last = program[program.length - 1];
    if (last.kind === 'repeat') {
      const bumped: Instruction = { ...last, times: Math.min(9, last.times + 1) };
      program = [...program.slice(0, -1), bumped];
      return;
    }
    if (last.kind === 'move') {
      const secondLast = program.length >= 2 ? program[program.length - 2] : null;
      if (secondLast && secondLast.kind === 'move') {
        const wrapped: Instruction = { kind: 'repeat', times: 2, body: [secondLast, last] };
        program = [...program.slice(0, -2), wrapped];
      } else {
        const wrapped: Instruction = { kind: 'repeat', times: 2, body: [last] };
        program = [...program.slice(0, -1), wrapped];
      }
    }
  };

  const addMini = () => {
    if (running || editingMini || program.length >= level.slots) return;
    crashPath = null;
    program = [...program, { kind: 'mini' }];
  };

  const removeAt = (index: number) => {
    if (running) return;
    crashPath = null;
    if (editingMini) mini = mini.filter((_, i) => i !== index);
    else program = program.filter((_, i) => i !== index);
  };

  const clear = () => {
    if (running) return;
    if (editingMini) mini = [];
    else program = [];
    crashPath = null;
    robotAt = { ...level.start };
  };

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const play = async () => {
    if (running || program.length === 0) return;
    running = true;
    crashPath = null;
    robotAt = { ...level.start };
    await wait(120);
    if (destroyed) return;

    const trace = run(level, program, mini);

    for (const step of trace.steps) {
      if (destroyed) return;
      activePath = step.path;
      if (step.outcome === 'moved') robotAt = step.to;
      await wait(STEP_MS);
    }
    if (destroyed) return;

    activePath = null;
    running = false;

    if (trace.status === 'goal') {
      solved = true;
      speak('You did it!');
      await wait(900);
      if (destroyed) return;
      onsolved(program.length);
    } else if (trace.status === 'crashed') {
      crashPath = trace.crashAt;
      speak('Bump! Try changing that step.');
    } else {
      speak('Not there yet. Add some more steps.');
    }
  };
</script>

<section class="level">
  <header>
    <button
      type="button" class="back" disabled={running}
      onclick={onback} aria-label="back to the levels"
    >⬅️</button>
    {#if level.miniSlots > 0}
      <button
        type="button" class="tab" class:on={editingMini} disabled={running}
        onclick={() => (editingMini = !editingMini)}
        aria-label={editingMini ? 'edit the main program' : 'edit the mini program'}
      >🧩</button>
    {/if}
    <span class="par" aria-hidden="true">⭐ {par(level)}</span>
  </header>

  <div class="world" class:solved>
    <GridWorld {level} {robotAt} {glyph} crashed={crashPath !== null} />
  </div>

  <ProgramStrip
    program={editingMini ? mini : program}
    slots={editingMini ? level.miniSlots : level.slots}
    {activePath}
    {crashPath}
    onremove={removeAt}
  />

  <ArrowPad
    arrows={level.arrows}
    repeatAllowed={level.repeatAllowed && !editingMini}
    miniSlots={editingMini ? 0 : level.miniSlots}
    {full}
    {running}
    onarrow={addArrow}
    onrepeat={addRepeat}
    onmini={addMini}
    onplay={play}
    onclear={clear}
  />
</section>

<style>
  .level {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    height: 100svh;
    padding: 0.5rem;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.5rem;
  }

  .back, .tab {
    min-width: 3.4rem;
    min-height: 3.4rem;
    border-radius: 16px;
    background: var(--card-bg);
    font-size: 1.5rem;
  }

  .tab.on { background: var(--accent-bg); border: 2px solid var(--accent); }

  .back:disabled, .tab:disabled { opacity: 0.35; }

  .par {
    margin-left: auto;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--accent);
  }

  .world {
    flex: 1 1 auto;
    width: 100%;
    max-width: 420px;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .world.solved { animation: cheer 0.5s ease; }

  @keyframes cheer {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
</style>
