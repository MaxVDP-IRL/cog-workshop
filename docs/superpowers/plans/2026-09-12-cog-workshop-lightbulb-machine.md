# Lightbulb Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second Cog Workshop game — the Lightbulb Machine (binary/place-value via switches worth 1, 2, 4, 8, 16) — as a fully playable bench reachable from Home, sharing the existing robot-parts reward loop and garage.

**Architecture:** Mirrors Teach the Robot's structure exactly: a pure-TypeScript `src/engine/lightbulb/` module (switch state as a bitmask — since switch values are non-overlapping powers of two, "which switches are lit" and "their sum" are the same integer, so toggling is a single XOR) behind the same barrel, a parallel pair of progress-tracking functions in `src/engine/progress.ts` alongside the existing robot ones (kept separate, not unified, to protect Oskar's real save data), and Svelte 5 UI components in `src/ui/lightbulb/` wired into the existing `App.svelte` router.

**Tech Stack:** TypeScript, Vite, Svelte 5 (runes), Vitest — identical to the shipped robot game, same repo.

**Spec:** [docs/superpowers/specs/2026-08-02-cog-workshop-design.md](../specs/2026-08-02-cog-workshop-design.md) (Game 2: Lightbulb Machine)

**Reference implementation:** the already-shipped robot game in this same repo (`src/engine/robot/`, `src/ui/robot/`, `src/engine/progress.ts`, `src/platform/storage.ts`). When this plan is ambiguous about style, match that code.

---

## Context you need before starting

**This is an ADDITIVE plan onto a live, shipped app.** `main` already has Teach the Robot fully working, and — this matters — **a real save file belonging to Oskar may already exist in a real browser's localStorage.** Every change to `src/engine/progress.ts` and `src/platform/storage.ts` in this plan is deliberately designed to never rename or restructure an existing `ProgressState` field. New fields are *added*; nothing existing is renamed, removed, or reinterpreted. Do not "clean up" the robot/lightbulb naming asymmetry this creates (e.g. `completedLevels` for robot vs. `lightbulbCompletedLevels` for lightbulb) — it is deliberate. `screen` state in `App.svelte`, by contrast, is never persisted (it always starts at `'home'`), so renaming its string literals is zero-risk and *is* done in this plan for clarity.

**Design decisions made for this plan that the spec doesn't spell out** (the spec describes the game conceptually; these are the implementation calls this plan makes):

1. **Switch state is a single integer bitmask.** Switch values (1, 2, 4, 8, 16) are non-overlapping powers of two, so "which switches are lit" and "their sum" are the exact same number. A level's target is just an integer 0–31; the machine is solved the instant the lit bitmask equals the target. There is no separate "run" step like the robot game has — flipping a switch has an immediate, live effect, and matching triggers success automatically. This is a deliberate difference from the robot game's build-then-run flow, not an oversight.
2. **"Tidy" (the bonus-part condition) means reaching the target in the fewest possible taps** — i.e. total switch-flip actions since the level loaded or was last cleared, not "how many switches ended up on" (that number is *always* fixed at `litCount(target)` for any winning state, since winning requires exactly matching the target — so it can't be used to measure efficiency). `par(level)` is `litCount(level.target)`; a solve is tidy when `tapsUsed <= par(level)`, mirroring the robot game's `tilesUsed <= par(level)` check exactly.
3. **14 levels across 4 stages** (targets 1–3 with 2 switches, then introducing one more switch per stage up to all 5), not one level per integer 1–31 — matching the robot game's "roughly 4 levels per stage" density rather than exhaustively covering every target.
4. **Count-up mode is a separate bonus screen**, unlocked once all 14 real levels are completed, reachable from the Lightbulb bench. It has no win condition, no progress tracking of its own — it's a toy for watching the counting pattern, exactly as the spec describes ("revealing the pattern by which the machine counts").
5. **The shared parts catalogue is expanded by 20 parts** (4 per slot), because awards now come from two games (15 robot levels + 14 lightbulb levels, each with a possible tidy bonus) drawing from the same pool.
6. **`RobotLevel.svelte` already had to fix a real bug**, discovered during the robot game's final review: an async `play()` continuation can outlive the component that started it if the child navigates away mid-celebration, and Svelte does not cancel in-flight promises on component teardown. `LightbulbMachine.svelte` has the exact same shape (toggle → detect win → `speak()` → `await wait(...)` → fire a callback into `App.svelte`), so this plan builds the same `onDestroy`-driven guard into it from the start rather than discovering the bug again later.

---

## File Structure

```
src/
├── engine/
│   ├── index.ts                          MODIFY — add lightbulb + new progress exports
│   ├── progress.ts                       MODIFY — add lightbulb fields + functions
│   ├── parts.ts                          MODIFY — append 20 new parts
│   └── lightbulb/
│       ├── types.ts                      SwitchValue, SWITCH_VALUES, Level
│       ├── machine.ts                    toggle/isOn/litCount/nextCount/MAX_LIT — pure, tested
│       └── levels.ts                     the 14 levels + levelById/firstLevelId/nextLevelId/par
├── platform/
│   └── storage.ts                        MODIFY — generalize id-sanitizing, cover new fields
└── ui/
    ├── Home.svelte                       MODIFY — unlock the lightbulb tile
    ├── App.svelte                        MODIFY — rename screen states, wire lightbulb routing
    └── lightbulb/
        ├── LightbulbBench.svelte         level select, mirrors RobotBench.svelte
        ├── LightbulbMachine.svelte       the play screen, mirrors RobotLevel.svelte
        └── LightbulbCountUp.svelte       the bonus counting-pattern toy

tests/engine/
├── lightbulb.test.ts                     machine.ts logic
├── lightbulb-levels.test.ts              level content + solvability-equivalent checks
├── progress.test.ts                      MODIFY — append lightbulb coverage
├── parts.test.ts                         MODIFY — bump the minimum-count assertion
└── storage.test.ts                       MODIFY — append lightbulb sanitization coverage
```

**Why `engine/lightbulb/` mirrors `engine/robot/` exactly:** three games will eventually exist side by side; keeping each self-contained under its own folder, with its own `types.ts`/content file, means Marble Machine (the next plan) drops in the same way without reshuffling anything here.

**Why `isLightbulbLevelUnlocked`/`completeLightbulbLevel` are separate functions in `progress.ts`, not a generalization of `isLevelUnlocked`/`completeLevel`:** the two functions are small (~15 lines each) and the alternative — parameterizing them over "which level registry" — adds a layer of indirection for exactly two call sites today. When Marble Machine adds a third, near-identical pair, that's the point to judge whether extracting a shared helper is worth it; forcing the abstraction now, for two instances, would be speculative.

---

### Task 1: Lightbulb engine — types and machine logic

**Files:**
- Create: `src/engine/lightbulb/types.ts`, `src/engine/lightbulb/machine.ts`
- Test: `tests/engine/lightbulb.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/engine/lightbulb.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toggle, isOn, litCount, nextCount, MAX_LIT } from '../../src/engine/lightbulb/machine';

describe('toggle', () => {
  it('turns a switch on from off', () => {
    expect(toggle(0, 4)).toBe(4);
  });

  it('turns a switch off from on', () => {
    expect(toggle(4, 4)).toBe(0);
  });

  it('leaves other switches untouched', () => {
    expect(toggle(0b00101, 0b00010)).toBe(0b00111);
  });
});

describe('isOn', () => {
  it('reports a lit switch as on', () => {
    expect(isOn(0b00110, 2)).toBe(true);
    expect(isOn(0b00110, 4)).toBe(true);
  });

  it('reports an unlit switch as off', () => {
    expect(isOn(0b00110, 1)).toBe(false);
    expect(isOn(0b00110, 8)).toBe(false);
  });
});

describe('litCount', () => {
  it('counts zero for nothing lit', () => {
    expect(litCount(0)).toBe(0);
  });

  it('counts each lit bit once', () => {
    expect(litCount(1)).toBe(1);
    expect(litCount(3)).toBe(2);
    expect(litCount(7)).toBe(3);
    expect(litCount(31)).toBe(5);
  });
});

describe('nextCount', () => {
  it('increments by one', () => {
    expect(nextCount(0)).toBe(1);
    expect(nextCount(5)).toBe(6);
  });

  it('wraps back to zero after the maximum', () => {
    expect(nextCount(MAX_LIT)).toBe(0);
  });

  it('has a maximum of 31 with all five switches', () => {
    expect(MAX_LIT).toBe(31);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/engine/lightbulb/machine`.

- [ ] **Step 3: Write `src/engine/lightbulb/types.ts`**

```ts
export type SwitchValue = 1 | 2 | 4 | 8 | 16;

export const SWITCH_VALUES: SwitchValue[] = [1, 2, 4, 8, 16];

export interface Level {
  id: string;
  /** Which of the four switch-count stages this level belongs to. */
  stage: 1 | 2 | 3 | 4;
  /** Switches visible and tappable at this level, in ascending value order. */
  switches: SwitchValue[];
  /** The number Oskar must light up. */
  target: number;
}
```

- [ ] **Step 4: Write `src/engine/lightbulb/machine.ts`**

```ts
import type { SwitchValue } from './types';
import { SWITCH_VALUES } from './types';

/**
 * The lit-switches state IS the total: switch values are powers of two with
 * no overlap, so a bitmask of "which switches are on" and "their sum" are
 * the same integer. Toggling a switch is therefore a single XOR.
 */
export const toggle = (lit: number, sw: SwitchValue): number => lit ^ sw;

export const isOn = (lit: number, sw: SwitchValue): boolean => (lit & sw) !== 0;

/** How many switches are lit — the fewest possible taps to reach this state from off. */
export const litCount = (n: number): number =>
  n.toString(2).split('').filter((bit) => bit === '1').length;

/** The bitmask with every switch in the app turned on (all five: 1+2+4+8+16). */
export const MAX_LIT: number = SWITCH_VALUES.reduce((sum, sw) => sum + sw, 0);

/** The next state in the counting sequence, wrapping back to 0 after MAX_LIT. */
export const nextCount = (lit: number): number => (lit >= MAX_LIT ? 0 : lit + 1);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 10 new tests.

- [ ] **Step 6: Commit**

```bash
git add src/engine/lightbulb/types.ts src/engine/lightbulb/machine.ts tests/engine/lightbulb.test.ts
git commit -m "feat(engine): lightbulb switch state as a bitmask"
```

---

### Task 2: Lightbulb engine — level content

Every target is representable by construction (any integer fits in 5 binary digits), so there's no "solvability" question the way the robot game has one. What this task's tests guarantee instead: no level ever requires a switch it doesn't offer yet, and `par` genuinely tracks the target's bit count.

**Files:**
- Create: `src/engine/lightbulb/levels.ts`
- Test: `tests/engine/lightbulb-levels.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/engine/lightbulb-levels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LEVELS, levelById, firstLevelId, nextLevelId, par } from '../../src/engine/lightbulb/levels';
import { SWITCH_VALUES } from '../../src/engine/lightbulb/types';
import { litCount } from '../../src/engine/lightbulb/machine';

describe('lightbulb level content', () => {
  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders levels by stage, never going backwards', () => {
    const stages = LEVELS.map((l) => l.stage);
    expect([...stages].sort((a, b) => a - b)).toEqual(stages);
  });

  it('starts at stage 1', () => {
    expect(levelById(firstLevelId()).stage).toBe(1);
  });

  it('offers exactly stage+1 switches at each stage', () => {
    for (const level of LEVELS) {
      expect(level.switches.length, `${level.id}`).toBe(level.stage + 1);
    }
  });

  it('keeps every switch list in ascending value order', () => {
    for (const level of LEVELS) {
      expect(level.switches).toEqual([...level.switches].sort((a, b) => a - b));
    }
  });

  it('only requires switches the level actually offers', () => {
    for (const level of LEVELS) {
      for (const sw of SWITCH_VALUES) {
        const bitNeeded = (level.target & sw) !== 0;
        if (bitNeeded) {
          expect(level.switches, `${level.id} needs switch ${sw} for target ${level.target}`).toContain(sw);
        }
      }
    }
  });

  it('derives par from the target litCount', () => {
    for (const level of LEVELS) {
      expect(par(level)).toBe(litCount(level.target));
    }
  });

  it('never targets zero', () => {
    for (const level of LEVELS) expect(level.target).toBeGreaterThan(0);
  });

  it('chains levels in order and ends with null', () => {
    let id: string | null = firstLevelId();
    let count = 0;
    while (id) { count++; id = nextLevelId(id); }
    expect(count).toBe(LEVELS.length);
  });

  it('throws on an unknown id', () => {
    expect(() => levelById('nope')).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/engine/lightbulb/levels`.

- [ ] **Step 3: Write `src/engine/lightbulb/levels.ts`**

Coordinate the difficulty: within each stage, targets climb through a spread of bit-counts (1 bit is easiest — a single switch — up to using every switch in the stage). Stage 4's final level (target 31) uses every switch there is, deliberately closing out the game the same way world 4 closes the robot game.

```ts
import { litCount } from './machine';
import type { Level } from './types';

export const LEVELS: Level[] = [
  // ---------------------------------------------------------------- Stage 1
  // Two switches. Targets 1, 2, 3 — every value they can make.
  { id: 'lb1-1', stage: 1, switches: [1, 2], target: 1 },
  { id: 'lb1-2', stage: 1, switches: [1, 2], target: 2 },
  { id: 'lb1-3', stage: 1, switches: [1, 2], target: 3 },

  // ---------------------------------------------------------------- Stage 2
  // Three switches (up to 7). Climbing bit-count: 1, 2, then all three.
  // target 5 (not 6) pairs switch 1 with the newest switch, matching how
  // lb3-2 and lb4-2 each pair switch 1 with their own newest switch.
  { id: 'lb2-1', stage: 2, switches: [1, 2, 4], target: 4 },
  { id: 'lb2-2', stage: 2, switches: [1, 2, 4], target: 5 },
  { id: 'lb2-3', stage: 2, switches: [1, 2, 4], target: 7 },

  // ---------------------------------------------------------------- Stage 3
  // Four switches (up to 15).
  { id: 'lb3-1', stage: 3, switches: [1, 2, 4, 8], target: 8 },
  { id: 'lb3-2', stage: 3, switches: [1, 2, 4, 8], target: 9 },
  { id: 'lb3-3', stage: 3, switches: [1, 2, 4, 8], target: 12 },
  { id: 'lb3-4', stage: 3, switches: [1, 2, 4, 8], target: 15 },

  // ---------------------------------------------------------------- Stage 4
  // All five switches (up to 31). The finale lights up every switch there is.
  { id: 'lb4-1', stage: 4, switches: [1, 2, 4, 8, 16], target: 16 },
  { id: 'lb4-2', stage: 4, switches: [1, 2, 4, 8, 16], target: 17 },
  { id: 'lb4-3', stage: 4, switches: [1, 2, 4, 8, 16], target: 24 },
  { id: 'lb4-4', stage: 4, switches: [1, 2, 4, 8, 16], target: 31 },
];

export const levelById = (id: string): Level => {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`unknown lightbulb level: ${id}`);
  return level;
};

export const firstLevelId = (): string => LEVELS[0].id;

export const nextLevelId = (id: string): string | null => {
  const index = LEVELS.findIndex((l) => l.id === id);
  return index >= 0 && index < LEVELS.length - 1 ? LEVELS[index + 1].id : null;
};

/** Fewest taps that can reach the target from off — the tidy-bonus threshold. */
export const par = (level: Level): number => litCount(level.target);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all 10 new level-content tests green. If "only requires switches the level actually offers" fails, the named level's `target` needs a switch not listed in its `switches` array — fix the level data, never the test.

- [ ] **Step 5: Commit**

```bash
git add src/engine/lightbulb/levels.ts tests/engine/lightbulb-levels.test.ts
git commit -m "feat(engine): 14 lightbulb levels across four stages"
```

---

### Task 3: Expand the shared parts catalogue

Robot has 15 levels (up to 30 possible awards counting tidy bonuses); lightbulb adds 14 more (up to 28 more). The existing 20-part catalogue needs real headroom now that two games draw from it.

**Files:**
- Modify: `src/engine/parts.ts`
- Modify: `tests/engine/parts.test.ts`

- [ ] **Step 1: Update the test's minimum-count assertion**

In `tests/engine/parts.test.ts`, change:

```ts
  it('has at least as many parts as there are levels to earn them', () => {
    expect(PARTS.length).toBeGreaterThanOrEqual(15);
  });
```

to:

```ts
  it('has at least as many parts as there are levels to earn them', () => {
    // 15 robot levels + 14 lightbulb levels, each capable of a tidy bonus.
    expect(PARTS.length).toBeGreaterThanOrEqual(29);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `PARTS.length` is currently 20, less than 29.

- [ ] **Step 3: Append 20 new parts to `src/engine/parts.ts`**

Continue the existing interleaved award-order pattern (one of each slot per round) for four more rounds. Change the `PARTS` array in `src/engine/parts.ts` from:

```ts
export const PARTS: Part[] = [
  { id: 'head-classic', slot: 'head', glyph: '🤖', label: 'a robot head' },
  { id: 'wheels-red', slot: 'wheels', glyph: '🛞', label: 'red wheels' },
  { id: 'antenna-star', slot: 'antenna', glyph: '⭐', label: 'a star aerial' },
  { id: 'body-box', slot: 'body', glyph: '📦', label: 'a box body' },
  { id: 'arms-claw', slot: 'arms', glyph: '🦾', label: 'claw arms' },
  { id: 'head-cat', slot: 'head', glyph: '🐱', label: 'a cat head' },
  { id: 'wheels-tank', slot: 'wheels', glyph: '🚜', label: 'tank tracks' },
  { id: 'antenna-bulb', slot: 'antenna', glyph: '💡', label: 'a light bulb aerial' },
  { id: 'body-rocket', slot: 'body', glyph: '🚀', label: 'a rocket body' },
  { id: 'arms-magnet', slot: 'arms', glyph: '🧲', label: 'magnet arms' },
  { id: 'head-dino', slot: 'head', glyph: '🦖', label: 'a dinosaur head' },
  { id: 'wheels-ball', slot: 'wheels', glyph: '⚽', label: 'ball wheels' },
  { id: 'antenna-flower', slot: 'antenna', glyph: '🌻', label: 'a flower aerial' },
  { id: 'body-crystal', slot: 'body', glyph: '💎', label: 'a crystal body' },
  { id: 'arms-wing', slot: 'arms', glyph: '🪽', label: 'wings' },
  { id: 'head-owl', slot: 'head', glyph: '🦉', label: 'an owl head' },
  { id: 'wheels-spring', slot: 'wheels', glyph: '🌀', label: 'springy wheels' },
  { id: 'antenna-rainbow', slot: 'antenna', glyph: '🌈', label: 'a rainbow aerial' },
  { id: 'body-drum', slot: 'body', glyph: '🥁', label: 'a drum body' },
  { id: 'arms-balloon', slot: 'arms', glyph: '🎈', label: 'balloon arms' },
];
```

to:

```ts
export const PARTS: Part[] = [
  { id: 'head-classic', slot: 'head', glyph: '🤖', label: 'a robot head' },
  { id: 'wheels-red', slot: 'wheels', glyph: '🛞', label: 'red wheels' },
  { id: 'antenna-star', slot: 'antenna', glyph: '⭐', label: 'a star aerial' },
  { id: 'body-box', slot: 'body', glyph: '📦', label: 'a box body' },
  { id: 'arms-claw', slot: 'arms', glyph: '🦾', label: 'claw arms' },
  { id: 'head-cat', slot: 'head', glyph: '🐱', label: 'a cat head' },
  { id: 'wheels-tank', slot: 'wheels', glyph: '🚜', label: 'tank tracks' },
  { id: 'antenna-bulb', slot: 'antenna', glyph: '💡', label: 'a light bulb aerial' },
  { id: 'body-rocket', slot: 'body', glyph: '🚀', label: 'a rocket body' },
  { id: 'arms-magnet', slot: 'arms', glyph: '🧲', label: 'magnet arms' },
  { id: 'head-dino', slot: 'head', glyph: '🦖', label: 'a dinosaur head' },
  { id: 'wheels-ball', slot: 'wheels', glyph: '⚽', label: 'ball wheels' },
  { id: 'antenna-flower', slot: 'antenna', glyph: '🌻', label: 'a flower aerial' },
  { id: 'body-crystal', slot: 'body', glyph: '💎', label: 'a crystal body' },
  { id: 'arms-wing', slot: 'arms', glyph: '🪽', label: 'wings' },
  { id: 'head-owl', slot: 'head', glyph: '🦉', label: 'an owl head' },
  { id: 'wheels-spring', slot: 'wheels', glyph: '🌀', label: 'springy wheels' },
  { id: 'antenna-rainbow', slot: 'antenna', glyph: '🌈', label: 'a rainbow aerial' },
  { id: 'body-drum', slot: 'body', glyph: '🥁', label: 'a drum body' },
  { id: 'arms-balloon', slot: 'arms', glyph: '🎈', label: 'balloon arms' },
  { id: 'head-frog', slot: 'head', glyph: '🐸', label: 'a frog head' },
  { id: 'wheels-skate', slot: 'wheels', glyph: '🛼', label: 'roller-skate wheels' },
  { id: 'antenna-kite', slot: 'antenna', glyph: '🪁', label: 'a kite aerial' },
  { id: 'body-vase', slot: 'body', glyph: '🏺', label: 'a vase body' },
  { id: 'arms-chopsticks', slot: 'arms', glyph: '🥢', label: 'chopstick arms' },
  { id: 'head-fox', slot: 'head', glyph: '🦊', label: 'a fox head' },
  { id: 'wheels-donut', slot: 'wheels', glyph: '🍩', label: 'donut wheels' },
  { id: 'antenna-bell', slot: 'antenna', glyph: '🔔', label: 'a bell aerial' },
  { id: 'body-basket', slot: 'body', glyph: '🧺', label: 'a basket body' },
  { id: 'arms-hook', slot: 'arms', glyph: '🪝', label: 'hook arms' },
  { id: 'head-panda', slot: 'head', glyph: '🐼', label: 'a panda head' },
  { id: 'wheels-frisbee', slot: 'wheels', glyph: '🥏', label: 'frisbee wheels' },
  { id: 'antenna-candle', slot: 'antenna', glyph: '🕯️', label: 'a candle aerial' },
  { id: 'body-gift', slot: 'body', glyph: '🎁', label: 'a gift box body' },
  { id: 'arms-hand', slot: 'arms', glyph: '🖐️', label: 'a friendly hand' },
  { id: 'head-penguin', slot: 'head', glyph: '🐧', label: 'a penguin head' },
  { id: 'wheels-ferris', slot: 'wheels', glyph: '🎡', label: 'ferris wheels' },
  { id: 'antenna-firework', slot: 'antenna', glyph: '🎆', label: 'a firework aerial' },
  { id: 'body-bag', slot: 'body', glyph: '🛍️', label: 'a shopping bag body' },
  { id: 'arms-fishing', slot: 'arms', glyph: '🎣', label: 'fishing-rod arms' },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS. Also run the full parts suite to confirm the new entries satisfy the existing invariants (unique ids, slot-prefixed ids, distinct glyphs):

Run: `npm test -- tests/engine/parts.test.ts`
Expected: PASS — all tests including "has unique ids" and "prefixes every part id with its slot".

- [ ] **Step 5: Commit**

```bash
git add src/engine/parts.ts tests/engine/parts.test.ts
git commit -m "feat(engine): expand the parts catalogue for the lightbulb game's awards"
```

---

### Task 4: Progress tracking for lightbulb levels

**Files:**
- Modify: `src/engine/progress.ts`
- Modify: `tests/engine/progress.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/engine/progress.test.ts` (add this import alongside the existing ones at the top of the file):

```ts
import { LEVELS as LIGHTBULB_LEVELS, firstLevelId as firstLightbulbLevelId } from '../../src/engine/lightbulb/levels';
```

and this import too, next to the existing `completeLevel`/`isLevelUnlocked` import:

```ts
import {
  newProgress, isLevelUnlocked, completeLevel, equippedOrDefault,
  isLightbulbLevelUnlocked, completeLightbulbLevel,
} from '../../src/engine/progress';
```

(Combine this with the existing import line from `'../../src/engine/progress'` rather than duplicating it — there should be exactly one import statement per module.)

Then append these two new `describe` blocks at the end of the file, before the final closing of the file:

```ts
describe('isLightbulbLevelUnlocked', () => {
  it('unlocks the first level immediately', () => {
    expect(isLightbulbLevelUnlocked(newProgress(), firstLightbulbLevelId())).toBe(true);
  });

  it('locks the second level until the first is complete', () => {
    const p = newProgress();
    expect(isLightbulbLevelUnlocked(p, LIGHTBULB_LEVELS[1].id)).toBe(false);
    const after = completeLightbulbLevel(p, LIGHTBULB_LEVELS[0].id, 1).progress;
    expect(isLightbulbLevelUnlocked(after, LIGHTBULB_LEVELS[1].id)).toBe(true);
  });

  it('keeps a completed level unlocked so it can be replayed', () => {
    const after = completeLightbulbLevel(newProgress(), LIGHTBULB_LEVELS[0].id, 1).progress;
    expect(isLightbulbLevelUnlocked(after, LIGHTBULB_LEVELS[0].id)).toBe(true);
  });

  it('does not affect or get affected by robot level unlocks', () => {
    const afterRobot = completeLevel(newProgress(), 'w1-1', 2).progress;
    expect(isLightbulbLevelUnlocked(afterRobot, LIGHTBULB_LEVELS[1].id)).toBe(false);

    const afterLightbulb = completeLightbulbLevel(newProgress(), LIGHTBULB_LEVELS[0].id, 1).progress;
    expect(isLevelUnlocked(afterLightbulb, 'w1-2')).toBe(false);
    expect(afterLightbulb.completedLevels).toEqual([]);
    expect(afterLightbulb.tidyLevels).toEqual([]);
  });
});

describe('completeLightbulbLevel', () => {
  it('records the level and awards one part', () => {
    // lb1-1's target is 1, so par is 1 (litCount(1) === 1).
    const { progress, earned } = completeLightbulbLevel(newProgress(), LIGHTBULB_LEVELS[0].id, 2);
    expect(progress.lightbulbCompletedLevels).toEqual([LIGHTBULB_LEVELS[0].id]);
    expect(earned).toHaveLength(1);
    expect(progress.parts).toEqual(earned);
  });

  it('awards a second part for solving in par taps', () => {
    const { progress, earned } = completeLightbulbLevel(newProgress(), LIGHTBULB_LEVELS[0].id, 1);
    expect(earned).toHaveLength(2);
    expect(progress.lightbulbTidyLevels).toEqual([LIGHTBULB_LEVELS[0].id]);
  });

  it('does not award the tidy part for using more taps than par', () => {
    const { progress, earned } = completeLightbulbLevel(newProgress(), LIGHTBULB_LEVELS[0].id, 3);
    expect(earned).toHaveLength(1);
    expect(progress.lightbulbTidyLevels).toEqual([]);
  });

  it('awards no duplicate part for replaying an already-completed level', () => {
    const first = completeLightbulbLevel(newProgress(), LIGHTBULB_LEVELS[0].id, 3).progress;
    const { progress, earned } = completeLightbulbLevel(first, LIGHTBULB_LEVELS[0].id, 3);
    expect(earned).toEqual([]);
    expect(progress.lightbulbCompletedLevels).toEqual([LIGHTBULB_LEVELS[0].id]);
  });

  it('awards the tidy part when a replay improves on a previous scruffy solve', () => {
    const first = completeLightbulbLevel(newProgress(), LIGHTBULB_LEVELS[0].id, 3).progress;
    const { progress, earned } = completeLightbulbLevel(first, LIGHTBULB_LEVELS[0].id, 1);
    expect(earned).toHaveLength(1);
    expect(progress.lightbulbTidyLevels).toEqual([LIGHTBULB_LEVELS[0].id]);
  });

  it('never mutates the progress it is given', () => {
    const p = newProgress();
    completeLightbulbLevel(p, LIGHTBULB_LEVELS[0].id, 1);
    expect(p.lightbulbCompletedLevels).toEqual([]);
    expect(p.parts).toEqual([]);
  });

  it('stops awarding once every part is owned', () => {
    const p = { ...newProgress(), parts: PARTS.map((x) => x.id) };
    const { earned } = completeLightbulbLevel(p, LIGHTBULB_LEVELS[0].id, 1);
    expect(earned).toEqual([]);
  });

  it('shares one parts pool with robot-level completions', () => {
    const afterRobot = completeLevel(newProgress(), 'w1-1', 2).progress;
    const { progress, earned } = completeLightbulbLevel(afterRobot, LIGHTBULB_LEVELS[0].id, 1);
    // Robot's w1-1 already claimed the first two parts (completion + tidy);
    // the lightbulb award should continue from where that left off, not restart.
    expect(progress.parts).toHaveLength(afterRobot.parts.length + earned.length);
    expect(new Set(progress.parts).size).toBe(progress.parts.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `isLightbulbLevelUnlocked`/`completeLightbulbLevel` don't exist, and `ProgressState` has no `lightbulbCompletedLevels`/`lightbulbTidyLevels` fields.

- [ ] **Step 3: Modify `src/engine/progress.ts`**

Change the imports at the top of the file from:

```ts
import { nextUnearnedPart, type Slot } from './parts';
import { LEVELS, levelById, par } from './robot/levels';
```

to:

```ts
import { nextUnearnedPart, type Slot } from './parts';
import { LEVELS, levelById, par } from './robot/levels';
import {
  LEVELS as LIGHTBULB_LEVELS, levelById as lightbulbLevelById, par as lightbulbPar,
} from './lightbulb/levels';
```

Change the `ProgressState` interface from:

```ts
export interface ProgressState {
  version: 1;
  /** Robot level ids completed at least once. */
  completedLevels: string[];
  /** Robot level ids solved in par tiles or fewer. */
  tidyLevels: string[];
  /** Earned part ids, in the order they were earned. */
  parts: string[];
  /** The part chosen for each garage slot. Absent means "first owned". */
  equipped: Partial<Record<Slot, string>>;
}
```

to:

```ts
export interface ProgressState {
  version: 1;
  /** Robot level ids completed at least once. */
  completedLevels: string[];
  /** Robot level ids solved in par tiles or fewer. */
  tidyLevels: string[];
  /** Lightbulb level ids completed at least once. */
  lightbulbCompletedLevels: string[];
  /** Lightbulb level ids solved in par taps or fewer. */
  lightbulbTidyLevels: string[];
  /** Earned part ids, in the order they were earned. Shared across every game. */
  parts: string[];
  /** The part chosen for each garage slot. Absent means "first owned". */
  equipped: Partial<Record<Slot, string>>;
}
```

Change `newProgress` from:

```ts
export const newProgress = (): ProgressState => ({
  version: 1,
  completedLevels: [],
  tidyLevels: [],
  parts: [],
  equipped: {},
});
```

to:

```ts
export const newProgress = (): ProgressState => ({
  version: 1,
  completedLevels: [],
  tidyLevels: [],
  lightbulbCompletedLevels: [],
  lightbulbTidyLevels: [],
  parts: [],
  equipped: {},
});
```

Add these two functions after the existing `completeLevel` function (before `equippedOrDefault`):

```ts
/** A lightbulb level is playable once the previous one is complete. The first is always open. */
export const isLightbulbLevelUnlocked = (progress: ProgressState, levelId: string): boolean => {
  const index = LIGHTBULB_LEVELS.findIndex((l) => l.id === levelId);
  if (index <= 0) return index === 0;
  return progress.lightbulbCompletedLevels.includes(LIGHTBULB_LEVELS[index - 1].id);
};

/**
 * Records a solved lightbulb level and awards parts: one for finishing, plus
 * one more for using no more taps than par. Mirrors completeLevel exactly,
 * kept as a separate function (rather than a shared generic) because there
 * are only two call sites today — see the plan for why.
 */
export const completeLightbulbLevel = (
  progress: ProgressState,
  levelId: string,
  tapsUsed: number,
): { progress: ProgressState; earned: string[] } => {
  const level = lightbulbLevelById(levelId);
  const firstCompletion = !progress.lightbulbCompletedLevels.includes(levelId);
  const tidy = tapsUsed <= lightbulbPar(level);
  const firstTidy = tidy && !progress.lightbulbTidyLevels.includes(levelId);

  const earned: string[] = [];
  let owned = [...progress.parts];
  for (let i = 0; i < (firstCompletion ? 1 : 0) + (firstTidy ? 1 : 0); i++) {
    const next = nextUnearnedPart(owned);
    if (!next) break;
    owned = [...owned, next];
    earned.push(next);
  }

  return {
    progress: {
      ...progress,
      lightbulbCompletedLevels: firstCompletion
        ? [...progress.lightbulbCompletedLevels, levelId]
        : progress.lightbulbCompletedLevels,
      lightbulbTidyLevels: firstTidy
        ? [...progress.lightbulbTidyLevels, levelId]
        : progress.lightbulbTidyLevels,
      parts: owned,
    },
    earned,
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all existing robot-progress tests still green (confirming the robot fields/functions are untouched), plus all new lightbulb-progress tests green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/progress.ts tests/engine/progress.test.ts
git commit -m "feat(engine): progress tracking, unlocks and awards for lightbulb levels"
```

---

### Task 5: Engine barrel

**Files:**
- Modify: `src/engine/index.ts`

- [ ] **Step 1: Update the barrel**

The robot game's exports (`LEVELS`, `levelById`, `firstLevelId`, `nextLevelId`, `par`, `Level`) keep their existing bare names — nothing that already imports from this barrel changes. Lightbulb's equivalents get distinct, prefixed names to avoid colliding with them. Change `src/engine/index.ts` from:

```ts
export { run } from './robot/simulator';
export { LEVELS, levelById, firstLevelId, nextLevelId, par } from './robot/levels';
export type {
  Cell, Direction, Instruction, Level, MiniInstruction, MoveInstruction,
  RepeatInstruction, StepOutcome, Trace, TraceStep,
} from './robot/types';

export { PARTS, SLOTS, partById, partsInSlot, nextUnearnedPart } from './parts';
export type { Part, Slot } from './parts';

export { newProgress, isLevelUnlocked, completeLevel, equippedOrDefault } from './progress';
export type { ProgressState } from './progress';
```

to:

```ts
export { run } from './robot/simulator';
export { LEVELS, levelById, firstLevelId, nextLevelId, par } from './robot/levels';
export type {
  Cell, Direction, Instruction, Level, MiniInstruction, MoveInstruction,
  RepeatInstruction, StepOutcome, Trace, TraceStep,
} from './robot/types';

export { toggle, isOn, litCount, nextCount, MAX_LIT } from './lightbulb/machine';
export { SWITCH_VALUES } from './lightbulb/types';
export type { SwitchValue, Level as LightbulbLevel } from './lightbulb/types';
export {
  LEVELS as LIGHTBULB_LEVELS, levelById as lightbulbLevelById,
  firstLevelId as firstLightbulbLevelId, nextLevelId as lightbulbNextLevelId,
  par as lightbulbPar,
} from './lightbulb/levels';

export { PARTS, SLOTS, partById, partsInSlot, nextUnearnedPart } from './parts';
export type { Part, Slot } from './parts';

export {
  newProgress, isLevelUnlocked, completeLevel,
  isLightbulbLevelUnlocked, completeLightbulbLevel, equippedOrDefault,
} from './progress';
export type { ProgressState } from './progress';
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors.

Run: `npm test`
Expected: PASS — no regressions, all prior tests still green.

- [ ] **Step 3: Commit**

```bash
git add src/engine/index.ts
git commit -m "feat(engine): export lightbulb module and progress functions from the barrel"
```

---

### Task 6: Persist and sanitize lightbulb progress

Robot's `sanitizeLevelIds`/`sanitizePartIds` are identical logic closed over two different validity sets — this task first unifies them into one generic helper (a safe, behavior-preserving refactor, since the existing storage tests will catch any regression), then uses it for the two new lightbulb fields too.

**Files:**
- Modify: `src/platform/storage.ts`
- Modify: `tests/engine/storage.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/engine/storage.test.ts`, inside the existing `describe('storage', ...)` block (after the last existing `it`, before the block's closing):

```ts
  it('drops unknown lightbulb level ids while keeping valid ones', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1,
      completedLevels: [],
      tidyLevels: [],
      lightbulbCompletedLevels: ['lb1-1', 'no-such-lightbulb-level'],
      lightbulbTidyLevels: ['lb1-1', 'no-such-lightbulb-level'],
      parts: [],
      equipped: {},
    }));
    const loaded = loadProgress();
    expect(loaded.lightbulbCompletedLevels).toEqual(['lb1-1']);
    expect(loaded.lightbulbTidyLevels).toEqual(['lb1-1']);
  });

  it('backfills lightbulb fields missing from an older save', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1, completedLevels: [], tidyLevels: [], parts: [], equipped: {},
    }));
    const loaded = loadProgress();
    expect(loaded.lightbulbCompletedLevels).toEqual([]);
    expect(loaded.lightbulbTidyLevels).toEqual([]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — a save with no `lightbulbCompletedLevels`/`lightbulbTidyLevels` at all currently round-trips fine (they'd be `undefined`, not `[]`, since the spread doesn't sanitize them), and an unknown lightbulb level id isn't filtered out.

- [ ] **Step 3: Modify `src/platform/storage.ts`**

Change the import line from:

```ts
import { newProgress, LEVELS, PARTS, type ProgressState, type Slot } from '../engine';
```

to:

```ts
import { newProgress, LEVELS, LIGHTBULB_LEVELS, PARTS, type ProgressState, type Slot } from '../engine';
```

Replace the two near-duplicate sanitizers and their validity sets:

```ts
const validLevelIds = new Set(LEVELS.map((l) => l.id));
const validPartIds = new Set(PARTS.map((p) => p.id));

/** Keeps only level ids that exist in the current LEVELS catalogue. */
const sanitizeLevelIds = (ids: unknown): string[] =>
  Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && validLevelIds.has(id)) : [];

/** Keeps only part ids that exist in the current PARTS catalogue. */
const sanitizePartIds = (ids: unknown): string[] =>
  Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && validPartIds.has(id)) : [];
```

with:

```ts
const validLevelIds = new Set(LEVELS.map((l) => l.id));
const validLightbulbLevelIds = new Set(LIGHTBULB_LEVELS.map((l) => l.id));
const validPartIds = new Set(PARTS.map((p) => p.id));

/** Keeps only ids present in the given valid-id set. */
const sanitizeIds = (ids: unknown, valid: Set<string>): string[] =>
  Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && valid.has(id)) : [];

/**
 * Thin, named wrappers around sanitizeIds, one per field. A bare
 * sanitizeIds(ids, validSet) call site can silently pass the wrong Set —
 * validLevelIds and validLightbulbLevelIds are both plain Set<string>, so
 * TypeScript can't catch the mix-up. These wrappers turn that mistake into
 * an obvious wrong-function-name typo instead.
 */
const sanitizeRobotLevelIds = (ids: unknown): string[] => sanitizeIds(ids, validLevelIds);
const sanitizeLightbulbLevelIds = (ids: unknown): string[] => sanitizeIds(ids, validLightbulbLevelIds);
const sanitizePartIds = (ids: unknown): string[] => sanitizeIds(ids, validPartIds);
```

Update every call site inside `loadProgress` from:

```ts
    return {
      ...newProgress(),
      ...parsed,
      completedLevels: sanitizeLevelIds(parsed.completedLevels),
      tidyLevels: sanitizeLevelIds(parsed.tidyLevels),
      parts: sanitizePartIds(parsed.parts),
      equipped: sanitizeEquipped(parsed.equipped),
    };
```

to:

```ts
    return {
      ...newProgress(),
      ...parsed,
      completedLevels: sanitizeRobotLevelIds(parsed.completedLevels),
      tidyLevels: sanitizeRobotLevelIds(parsed.tidyLevels),
      lightbulbCompletedLevels: sanitizeLightbulbLevelIds(parsed.lightbulbCompletedLevels),
      lightbulbTidyLevels: sanitizeLightbulbLevelIds(parsed.lightbulbTidyLevels),
      parts: sanitizePartIds(parsed.parts),
      equipped: sanitizeEquipped(parsed.equipped),
    };
```

`loadProgress` never calls `sanitizeIds` directly with a raw `Set` argument — only through one of the three named wrappers above.

`sanitizeEquipped` (the object-shaped sanitizer, distinct from the array-shaped ones) stays exactly as it is — it already only checks part ids, which is unaffected by this change.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — every existing storage test still green (confirming the `sanitizeIds` refactor preserved behavior for the robot/part cases) plus the two new lightbulb tests.

- [ ] **Step 5: Commit**

```bash
git add src/platform/storage.ts tests/engine/storage.test.ts
git commit -m "feat(platform): sanitize lightbulb progress fields on load"
```

---

### Task 7: LightbulbBench — level select

**Files:**
- Create: `src/ui/lightbulb/LightbulbBench.svelte`

- [ ] **Step 1: Write the component**

Mirrors `RobotBench.svelte` exactly, grouped by `stage` instead of `world`, plus a bonus count-up tile that appears once every level is done.

```svelte
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/ui/lightbulb/LightbulbBench.svelte
git commit -m "feat(ui): lightbulb level select with lock and completion state"
```

---

### Task 8: LightbulbMachine — the play screen

This is the heart of the game, mirroring `RobotLevel.svelte`'s role. Unlike the robot game, there's no separate "run" step — flipping a switch has an immediate effect, and matching the target auto-completes the level. The `onDestroy` teardown guard is built in from the start, because this component has the exact same shape (toggle → detect win → `speak()` → `await wait(...)` → fire a callback) that required a bug fix in `RobotLevel.svelte` after the fact.

**Files:**
- Create: `src/ui/lightbulb/LightbulbMachine.svelte`

- [ ] **Step 1: Write the component**

```svelte
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/ui/lightbulb/LightbulbMachine.svelte
git commit -m "feat(ui): lightbulb play screen with live total and auto-solve"
```

---

### Task 9: LightbulbCountUp — the bonus counting toy

No win condition, no progress tracking — a switches-only display driven purely by the +1 button, exactly per spec ("pressing it repeatedly ticks the bulbs through the counting sequence").

**Files:**
- Create: `src/ui/lightbulb/LightbulbCountUp.svelte`

- [ ] **Step 1: Write the component**

```svelte
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/ui/lightbulb/LightbulbCountUp.svelte
git commit -m "feat(ui): lightbulb counting-pattern bonus toy"
```

---

### Task 10: Unlock the Lightbulb Machine on Home

**Files:**
- Modify: `src/ui/Home.svelte`

- [ ] **Step 1: Change the lightbulb bench from locked to live**

Change `src/ui/Home.svelte`'s script block from:

```svelte
<script lang="ts">
  let {
    partCount,
    onrobot,
    ongarage,
  }: {
    partCount: number;
    onrobot: () => void;
    ongarage: () => void;
  } = $props();
</script>
```

to:

```svelte
<script lang="ts">
  let {
    partCount,
    onrobot,
    onlightbulb,
    ongarage,
  }: {
    partCount: number;
    onrobot: () => void;
    onlightbulb: () => void;
    ongarage: () => void;
  } = $props();
</script>
```

Change the lightbulb button from:

```svelte
    <button type="button" class="bench locked" disabled aria-label="lightbulb machine, locked">
      <span class="glyph">💡</span>
      <span class="lock" aria-hidden="true">🔒</span>
    </button>
```

to:

```svelte
    <button type="button" class="bench" onclick={onlightbulb} aria-label="lightbulb machine">
      <span class="glyph">💡</span>
    </button>
```

The marble machine button and every style rule stay exactly as they are — `.bench.locked`/`.lock` are still needed for it.

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors — this step will actually FAIL here, on purpose, until Task 11 updates `App.svelte` to pass the new `onlightbulb` prop `Home` now requires. That's expected; proceed to Task 11 before treating this as a problem.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Home.svelte
git commit -m "feat(ui): unlock the lightbulb machine bench on the home screen"
```

---

### Task 11: Wire up App routing

Renames the two existing screen names for clarity (`'bench'` → `'robot-bench'`, `'level'` → `'robot-level'`) — safe because `screen` is session-only state, never persisted — and adds the three new lightbulb screens.

**Files:**
- Modify: `src/ui/App.svelte`

- [ ] **Step 1: Replace the whole file**

`src/ui/App.svelte`, in full:

```svelte
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
```

- [ ] **Step 2: Verify everything type-checks and tests still pass**

Run: `npm run check`
Expected: no errors, no warnings.

Run: `npm test`
Expected: PASS — every engine test green.

- [ ] **Step 3: Play it locally**

Run: `npm run dev`

Using the browser's device toolbar set to iPhone 13 mini (375×812):
- Home shows the robot and lightbulb benches both live; marble is still locked.
- Opening the lightbulb bench shows only stage 1's three levels unlocked; the count-up tile is not visible yet.
- Opening `lb1-1` (target 1) shows a single-dot target, a "1" numeral, two switches (worth 1 and 2), and a total of 0.
- Tapping the "1" switch immediately shows the total change to 1, triggers the win animation, speaks "You did it!", and — after the pause — pops the award pop-up.
- Dismissing the award advances to `lb1-2` (target 2) automatically.
- After completing every lightbulb level, the count-up tile appears on the bench; opening it shows all 5 switches and a +1 button that increments the total, wrapping from 31 back to 0.
- Robot game (already shipped) still works exactly as before — solve `w1-1` and confirm the award and progression flow is unaffected by this change.
- Fully reload the page and confirm both games' unlocked/completed state survived (check `localStorage['cog-workshop:progress']` directly if useful).

- [ ] **Step 4: Commit**

```bash
git add src/ui/App.svelte
git commit -m "feat(ui): route to the lightbulb machine and rename screen states for clarity"
```

---

### Task 12: Ship it

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README status**

Replace the `## Status` section of `README.md` with:

```markdown
## Status

🤖💡 **v1 live** — the shared shell, Teach the Robot (15 levels, four worlds),
and the Lightbulb Machine (14 levels, four stages, plus a counting-pattern
bonus mode). Marble Machine is next, with its own plan.

**Play:** https://maxvdp-irl.github.io/cog-workshop/
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: mark the lightbulb machine as shipped"
```

- [ ] **Step 3: Test on the real devices**

Open the deployed URL on the iPhone 13 mini and the Galaxy S20 once this is live. This is the test the unit suite cannot do.

Check:
- [ ] Switch buttons are comfortably hittable with a 5-year-old's finger.
- [ ] Nothing requires reading beyond numerals Oskar already recognizes — every other affordance is icons/dots/audio.
- [ ] The dot patterns for each switch value are visually easy to tell apart at a glance (1 vs 2 vs 4 vs 8 vs 16).
- [ ] The win moment (switches light up, "You did it!") is satisfying and not too fast to notice — if it feels abrupt, raise the `900` ms delay in `LightbulbMachine.svelte`'s `flip`.
- [ ] Spoken audio plays (remember: iOS Safari stays silent on the very first tap of a session).
- [ ] Closing and reopening the app preserves both games' progress independently.

- [ ] **Step 4: Watch Oskar play, and change nothing while he does**

Specifically worth noting:
- Does he notice the total updating live as he flips switches, or does he need the win moment to realize what's happening?
- Does he ever try to reach a target by trial and error rather than reasoning about which switches to flip — and if so, does watching the total help him course-correct?
- Does the jump from 2 switches to 3 (stage 1 → stage 2) feel like a natural step, or does adding a third option overwhelm him?
- Once he reaches count-up mode, does he predict what a switch will do before pressing +1, or is it purely something he watches?

Record what you observe in the repo — it's the input for tuning stages 2–4 and for the Marble Machine plan.

---

## Plan Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Five switches worth 1, 2, 4, 8, 16, each shown with that many dots | 8 |
| Target shown as both objects and a numeral | 8 |
| Running total shown live | 8 |
| Matching the target makes the machine light up and run | 8 |
| Progression: 2 switches (targets 1–3) up to all 5 (up to 31) | 2 |
| Count-up mode with a +1 button revealing the counting pattern | 9 |
| Shared reward loop (robot parts, garage) — not a separate currency | 4, 6 |
| No buzzers/lives/timers, unlimited retries | 8 (no failure state) |
| Engine tests: switch combinations produce exact totals | 1 |
| Content validity: every level usable within its available switches | 2 |
| Home screen shows the lightbulb bench as live, no longer locked | 10, 11 |
| Backward compatibility with existing (robot-only) save data | 4, 6 (context section) |

**Placeholder scan:** no TBDs, no "add error handling," no references to undefined functions. Every code step carries complete code.

**Type consistency:** `Level` (lightbulb) is exported as `LightbulbLevel` from the barrel in Task 5 and imported that way everywhere it's used (Tasks 8, 11) — never as the bare `Level`, which stays the robot type. `completeLightbulbLevel`'s return shape (`{ progress, earned }`) matches `completeLevel`'s exactly, and `App.svelte` destructures both the same way. `isLightbulbLevelUnlocked`/`lightbulbLevelById`/`lightbulbNextLevelId`/`lightbulbPar` names are used consistently from their definition in Tasks 4–5 through their consumption in Tasks 7, 8, 11. `SwitchValue`/`SWITCH_VALUES`/`toggle`/`isOn`/`litCount`/`nextCount`/`MAX_LIT` are defined once in Task 1 and used with those exact names in Tasks 2, 4, 8, 9.
