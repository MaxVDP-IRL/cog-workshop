# Marble Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the third and final Cog Workshop game — the Marble Machine (routing, halving/doubling, cause-and-effect via a discrete tap-to-place grid) — as a fully playable bench reachable from Home, sharing the existing robot-parts reward loop and garage. Unlocking it removes the last locked tile on the home screen.

**Architecture:** Mirrors the two already-shipped games exactly: a pure-TypeScript `src/engine/marble/` module (a deterministic, provably-terminating tick simulation — no physics, no gravity, no collision handling) behind the same barrel, a third parallel pair of progress-tracking functions in `src/engine/progress.ts` alongside the existing robot and lightbulb ones, and Svelte 5 UI components in `src/ui/marble/` wired into the existing `App.svelte` router.

**Tech Stack:** TypeScript, Vite, Svelte 5 (runes), Vitest — identical to both shipped games, same repo.

**Spec:** [docs/superpowers/specs/2026-08-02-cog-workshop-design.md](../specs/2026-08-02-cog-workshop-design.md) (Game 3: Marble Machine)

**Reference implementation:** the already-shipped robot and lightbulb games in this same repo (`src/engine/robot/`, `src/engine/lightbulb/`, `src/ui/robot/`, `src/ui/lightbulb/`, `src/engine/progress.ts`, `src/platform/storage.ts`). When this plan is ambiguous about style, match that code.

---

## Context you need before starting

**This is an ADDITIVE plan onto a live, shipped app with two real games already in Oskar's hands.** Every change to `src/engine/progress.ts` and `src/platform/storage.ts` in this plan is deliberately designed to never rename or restructure an existing `ProgressState` field. New fields are *added*; nothing existing is renamed, removed, or reinterpreted. `screen` state in `App.svelte`, by contrast, is never persisted, so adding new string literals to it is zero-risk.

**Design decisions made for this plan that the spec doesn't spell out** (the spec describes the game conceptually — "route marbles into the correct buckets," "splitters take one marble in and emit one on each side" — these are the concrete implementation calls this plan makes):

1. **Every level launches exactly one marble**, from a single fixed spawn cell at the top of the grid. Multiple marbles only ever come from a splitter cloning that one marble (and its clones) as they fall. This keeps level authoring simple and deterministic, and it's what makes "one marble in, two out" (the spec's own words) land as a literal, watchable moment rather than an abstraction.
2. **A splitter clones, it doesn't route.** A marble entering a splitter cell is replaced by two new marbles — one continuing down-left, one down-right — starting the next tick. This is the direct, literal reading of "splitters take one marble in and emit one on each side," and it's what makes doubling (1 marble → 2) and, downstream, halving (each branch carries half of whatever reaches a shared point) both directly observable rather than asserted.
3. **Movement is one row per tick, always.** A marble in a cell with no piece falls straight down one row per tick. A `ramp-left`/`ramp-right` piece in the marble's *current* cell shifts that one-tick fall diagonally instead of straight. This is the deterministic stand-in for gravity the spec explicitly asks for — no physics, no acceleration, just a fixed tick.
4. **Buckets are placed by the child, not pre-fixed**, exactly like ramps and splitters — matching the spec's palette list ("ramp-left, ramp-right, splitter, and bucket") literally. Each level visually marks which cells are *targets* (where a bucket needs to end up catching something); the win condition is "every target cell has a placed bucket, and at least one marble arrived there by the time the simulation ends." A bucket placed on a non-target cell just usefully-or-uselessly catches whatever lands there — no special-casing needed.
5. **A marble that reaches the bottom row with no bucket there, or drifts off the left/right edge, is removed from play without being caught.** This mirrors the robot game's crash and the lightbulb game's non-failure design: a miss is information, never a fail state, and it's never possible for the simulation to hang (every marble's row strictly increases each tick until it's caught or removed, so the whole simulation is provably bounded by the grid's height).
6. **"Tidy" (the bonus-part condition) means solving with no more than `par` pieces placed** — where `par(level) = level.solution.length`, i.e. the fewest pieces the level's own known-good solution needs — exactly mirroring the robot game's par (not lightbulb's cumulative-taps model, since Marble, like Robot, has a discrete build-then-run step, not a live/continuous one). `pieces.length` at the moment a run wins is what's reported to `completeMarbleLevel`, mirroring `tilesUsed = program.length` in the robot game exactly — not a cumulative edit counter.
7. **A third parallel `isMarbleLevelUnlocked`/`completeMarbleLevel` pair in `progress.ts`, deliberately not unified with the robot/lightbulb ones even though this is now the third instance of the same shape.** This was flagged as the point to revisit that decision, in both the original robot-game plan and the lightbulb-game plan's Task 6 review. Having looked at it now: a generic version would need to write into `ProgressState` via a computed/string field key (e.g. `progress[fields.completed]`), which loses the compiler's ability to verify that key actually names a `string[]` field on `ProgressState` — this is the exact class of risk that was found and fixed once already in `storage.ts` (its first-pass generic `sanitizeIds(ids, validSet)` could silently accept the wrong `Set` at a call site with no type error; the fix was three thin named wrapper functions). `ProgressState` is the single highest-stakes shape in this codebase — it's the literal contents of a real player's save file — so the same conclusion holds here: keep the three `completeXLevel` functions duplicated. `storage.ts`'s sanitizer, by contrast, generalizes safely (Task 6 below), because pure id-filtering has no save-shape ambiguity to lose.
8. **The shared parts catalogue expands from 40 to 60 parts** (12 per slot), because awards now come from three games (15 robot + 14 lightbulb + 12 marble levels, each with a possible tidy bonus — up to 82 possible draws against the existing 40-part pool).
9. **No new mechanic beyond ramps and splitters — three worlds, not four.** World 1 (ramps only), world 2 (introduce the splitter), world 3 (two splitters chained). Unlike the robot game's four worlds or the lightbulb game's four stages, there's no fourth distinct mechanic to build a world around, so this game has three.

---

## File Structure

```
src/
├── engine/
│   ├── index.ts                          MODIFY — add marble + new progress exports
│   ├── progress.ts                       MODIFY — add marble fields + functions
│   ├── parts.ts                          MODIFY — append 20 new parts
│   └── marble/
│       ├── types.ts                      Cell, MarblePiece(Kind), Level, TickState, Trace
│       ├── simulator.ts                  run(level, pieces) — pure, deterministic, tested
│       └── levels.ts                     the 12 levels + levelById/firstLevelId/nextLevelId/par
├── platform/
│   └── storage.ts                        MODIFY — sanitize the two new marble fields
└── ui/
    ├── Home.svelte                       MODIFY — unlock the marble tile (last locked bench)
    ├── App.svelte                        MODIFY — wire marble routing
    └── marble/
        ├── MarbleGrid.svelte             pure presentational board, mirrors GridWorld.svelte
        ├── MarbleMachine.svelte          the play screen, mirrors RobotLevel.svelte
        └── MarbleBench.svelte            level select, mirrors RobotBench.svelte

tests/engine/
├── marble.test.ts                        simulator.ts logic
├── marble-levels.test.ts                 level content + solvability
├── progress.test.ts                      MODIFY — append marble coverage
├── parts.test.ts                         MODIFY — bump the minimum-count assertion
└── storage.test.ts                       MODIFY — append marble sanitization coverage
```

**Why `engine/marble/` defines its own `Cell` type rather than importing the robot game's:** `{x, y}` is structurally identical between the two, but the robot and lightbulb game folders have never imported from each other — each is fully self-contained, and a shared coordinate type would be the first thread connecting them. Keeping marble independent too, and duplicating this trivial shape, preserves that boundary. The barrel re-exports it as `MarbleCell` (not bare `Cell`) purely to avoid colliding with the robot game's already-bare-exported `Cell` — the type itself has no cross-game coupling.

---

### Task 1: Marble engine — types and simulator

The whole simulation is provably bounded: every marble's row strictly increases by exactly one on every tick it survives (whether falling straight, ramped, or freshly spawned from a splitter), so after `level.height` ticks every marble has either been caught or has left the grid. There is no way for this loop to hang.

**Files:**
- Create: `src/engine/marble/types.ts`, `src/engine/marble/simulator.ts`
- Test: `tests/engine/marble.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/engine/marble.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { run } from '../../src/engine/marble/simulator';
import type { Level } from '../../src/engine/marble/types';

// A 3-wide, 3-tall board. Marble spawns top-middle.
const board: Level = {
  id: 'test-board',
  world: 1,
  width: 3,
  height: 3,
  spawn: { x: 1, y: 0 },
  targets: [{ x: 1, y: 2 }],
  slots: 3,
  palette: ['ramp-left', 'ramp-right'],
  solution: [{ cell: { x: 1, y: 2 }, kind: 'bucket' }],
};

describe('run — falling straight', () => {
  it('falls straight down with no pieces placed', () => {
    const trace = run(board, []);
    expect(trace.ticks).toHaveLength(3);
    expect(trace.ticks[0]).toEqual({ marbles: [{ x: 1, y: 0 }] });
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 1, y: 1 }] });
    expect(trace.ticks[2]).toEqual({ marbles: [{ x: 1, y: 2 }] });
  });

  it('catches a marble that lands on a bucket', () => {
    const trace = run(board, [{ cell: { x: 1, y: 2 }, kind: 'bucket' }]);
    expect(trace.caught).toEqual({ '1,2': 1 });
    // A caught marble is removed from play the next tick — the trace stops growing.
    expect(trace.ticks.at(-1)).toEqual({ marbles: [] });
  });
});

describe('run — ramps', () => {
  it('shifts the marble left through a ramp-left piece', () => {
    const trace = run(board, [{ cell: { x: 1, y: 0 }, kind: 'ramp-left' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 0, y: 1 }] });
  });

  it('shifts the marble right through a ramp-right piece', () => {
    const trace = run(board, [{ cell: { x: 1, y: 0 }, kind: 'ramp-right' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 2, y: 1 }] });
  });

  it('only redirects on the tick the marble is actually in that cell', () => {
    // A ramp at (0,1) does nothing to a marble that never passes through (0,1).
    const trace = run(board, [{ cell: { x: 1, y: 0 }, kind: 'ramp-right' }, { cell: { x: 0, y: 1 }, kind: 'ramp-left' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 2, y: 1 }] });
    expect(trace.ticks[2]).toEqual({ marbles: [{ x: 2, y: 2 }] });
  });
});

describe('run — splitter', () => {
  it('replaces one marble with two, one down-left and one down-right', () => {
    const trace = run(board, [{ cell: { x: 1, y: 0 }, kind: 'splitter' }]);
    expect(trace.ticks[1].marbles).toEqual(
      expect.arrayContaining([{ x: 0, y: 1 }, { x: 2, y: 1 }]),
    );
    expect(trace.ticks[1].marbles).toHaveLength(2);
  });

  it('catches both clones independently if each lands on its own bucket', () => {
    const wide: Level = { ...board, width: 3, height: 2 };
    const trace = run(wide, [
      { cell: { x: 1, y: 0 }, kind: 'splitter' },
      { cell: { x: 0, y: 1 }, kind: 'bucket' },
      { cell: { x: 2, y: 1 }, kind: 'bucket' },
    ]);
    expect(trace.caught).toEqual({ '0,1': 1, '2,1': 1 });
  });
});

describe('run — leaving the grid', () => {
  it('drops a marble that ramps off the left edge, without catching it anywhere', () => {
    const edge: Level = { ...board, spawn: { x: 0, y: 0 } };
    const trace = run(edge, [{ cell: { x: 0, y: 0 }, kind: 'ramp-left' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [] });
    expect(trace.caught).toEqual({});
  });

  it('drops a marble that reaches the bottom row with no bucket there', () => {
    const trace = run(board, []);
    expect(trace.caught).toEqual({});
    expect(trace.ticks.at(-1)).toEqual({ marbles: [] });
  });

  it('always terminates within height ticks, regardless of board size', () => {
    const tall: Level = { ...board, height: 6, targets: [{ x: 1, y: 5 }] };
    const trace = run(tall, []);
    expect(trace.ticks.length).toBeLessThanOrEqual(tall.height + 1);
    expect(trace.ticks.at(-1)).toEqual({ marbles: [] });
  });
});

describe('run — empty program', () => {
  it('produces a trace of exactly one tick when the level has height 1', () => {
    const flat: Level = { ...board, height: 1, spawn: { x: 1, y: 0 }, targets: [{ x: 1, y: 0 }] };
    const trace = run(flat, [{ cell: { x: 1, y: 0 }, kind: 'bucket' }]);
    expect(trace.ticks[0]).toEqual({ marbles: [{ x: 1, y: 0 }] });
    expect(trace.caught).toEqual({ '1,0': 1 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/engine/marble/simulator`.

- [ ] **Step 3: Write `src/engine/marble/types.ts`**

```ts
export type MarblePieceKind = 'ramp-left' | 'ramp-right' | 'splitter' | 'bucket';

export interface Cell {
  x: number; // column, 0 at the left, increasing rightwards
  y: number; // row, 0 at the top, increasing downwards
}

export interface MarblePiece {
  cell: Cell;
  kind: MarblePieceKind;
}

export interface Level {
  id: string;
  world: 1 | 2 | 3;
  width: number;
  height: number;
  /** Where the single marble starts, always row 0. */
  spawn: Cell;
  /** Cells that must each catch at least one marble by the end of the run. */
  targets: Cell[];
  /** Capacity of the piece budget, counted in placed pieces (ramps + splitters + buckets). */
  slots: number;
  /** Non-bucket piece kinds this level offers. Bucket is always offered. */
  palette: Exclude<MarblePieceKind, 'bucket'>[];
  /**
   * A known-good placement. Used by the content test to prove the level is
   * solvable, and its length defines par for the tidy bonus.
   */
  solution: MarblePiece[];
}

export interface TickState {
  marbles: Cell[];
}

export interface Trace {
  ticks: TickState[];
  /** Per-cell caught count, keyed `"x,y"` — only cells holding a placed bucket ever appear here. */
  caught: Record<string, number>;
}
```

- [ ] **Step 4: Write `src/engine/marble/simulator.ts`**

```ts
import type { Cell, Level, MarblePiece, MarblePieceKind, Trace, TickState } from './types';

const key = (c: Cell): string => `${c.x},${c.y}`;

/**
 * Runs one marble (and whatever it clones into) through a placed board,
 * returning every tick's marble positions and how many marbles each bucket
 * caught. Pure and deterministic: no randomness, no physics, no collision
 * handling between marbles sharing a cell.
 */
export const run = (level: Level, pieces: MarblePiece[]): Trace => {
  const board = new Map<string, MarblePieceKind>();
  for (const p of pieces) board.set(key(p.cell), p.kind);

  let marbles: Cell[] = [{ ...level.spawn }];
  const ticks: TickState[] = [{ marbles: marbles.map((m) => ({ ...m })) }];
  const caught: Record<string, number> = {};

  for (let t = 0; t < level.height + 1 && marbles.length > 0; t++) {
    const next: Cell[] = [];
    for (const m of marbles) {
      const k = key(m);
      const kind = board.get(k);

      if (kind === 'bucket') {
        caught[k] = (caught[k] ?? 0) + 1;
        continue;
      }
      if (kind === 'splitter') {
        next.push({ x: m.x - 1, y: m.y + 1 });
        next.push({ x: m.x + 1, y: m.y + 1 });
        continue;
      }

      const dx = kind === 'ramp-left' ? -1 : kind === 'ramp-right' ? 1 : 0;
      const to: Cell = { x: m.x + dx, y: m.y + 1 };
      if (to.x < 0 || to.x >= level.width || to.y >= level.height) continue;
      next.push(to);
    }
    marbles = next;
    ticks.push({ marbles: marbles.map((m) => ({ ...m })) });
  }

  return { ticks, caught };
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 12 new tests.

- [ ] **Step 6: Commit**

```bash
git add src/engine/marble/types.ts src/engine/marble/simulator.ts tests/engine/marble.test.ts
git commit -m "feat(engine): marble simulator — deterministic, provably-terminating tick loop"
```

---

### Task 2: Marble engine — level content

Every target's reachability depends on genuine geometry (which cells a marble actually visits given a placement), not a representability check like the lightbulb game's bit-containment test — so this task's content test runs each level's pinned `solution` through the real simulator and asserts every target is actually caught.

**Files:**
- Create: `src/engine/marble/levels.ts`
- Test: `tests/engine/marble-levels.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/engine/marble-levels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LEVELS, levelById, firstLevelId, nextLevelId, par } from '../../src/engine/marble/levels';
import { run } from '../../src/engine/marble/simulator';

describe('marble level content', () => {
  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders levels by world, never going backwards', () => {
    const worlds = LEVELS.map((l) => l.world);
    expect([...worlds].sort((a, b) => a - b)).toEqual(worlds);
  });

  it('starts in world 1 with ramps only, no splitter', () => {
    const first = levelById(firstLevelId());
    expect(first.world).toBe(1);
    expect(first.palette).not.toContain('splitter');
  });

  it('never offers a splitter before world 2', () => {
    for (const level of LEVELS.filter((l) => l.world === 1)) {
      expect(level.palette).not.toContain('splitter');
    }
  });

  it('is solvable: every target actually catches a marble when the pinned solution runs', () => {
    for (const level of LEVELS) {
      const trace = run(level, level.solution);
      for (const target of level.targets) {
        const count = trace.caught[`${target.x},${target.y}`] ?? 0;
        expect(count, `${level.id} target (${target.x},${target.y}) caught nothing`).toBeGreaterThan(0);
      }
    }
  });

  it('every solution fits within its slot budget', () => {
    for (const level of LEVELS) {
      expect(level.solution.length, `${level.id} solution exceeds its slots`).toBeLessThanOrEqual(level.slots);
    }
  });

  it('only uses pieces the level actually offers', () => {
    for (const level of LEVELS) {
      for (const piece of level.solution) {
        if (piece.kind === 'bucket') continue;
        expect(level.palette, `${level.id} uses ${piece.kind}`).toContain(piece.kind);
      }
    }
  });

  it('every solution places a bucket on every target', () => {
    for (const level of LEVELS) {
      for (const target of level.targets) {
        const hasBucket = level.solution.some(
          (p) => p.kind === 'bucket' && p.cell.x === target.x && p.cell.y === target.y,
        );
        expect(hasBucket, `${level.id} has no bucket placed on target (${target.x},${target.y})`).toBe(true);
      }
    }
  });

  it('keeps spawn, targets, and every solution piece inside the grid', () => {
    for (const level of LEVELS) {
      const cells = [level.spawn, ...level.targets, ...level.solution.map((p) => p.cell)];
      for (const cell of cells) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(level.width);
        expect(cell.y).toBeLessThan(level.height);
      }
    }
  });

  it('derives par from the solution piece count', () => {
    expect(par(levelById(firstLevelId()))).toBe(levelById(firstLevelId()).solution.length);
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
Expected: FAIL — cannot resolve `../../src/engine/marble/levels`.

- [ ] **Step 3: Write `src/engine/marble/levels.ts`**

Every level's pinned solution below was hand-traced against the simulator's exact semantics (`x` = column, `y` = row increasing downward; a piece in a marble's *current* cell redirects its next move). If the "is solvable" test fails for any level, the trace was wrong somewhere — fix that level's `solution` (or, if the geometry genuinely can't work, the level's `spawn`/`targets`), never weaken the test.

```ts
import type { Level } from './types';

export const LEVELS: Level[] = [
  // ---------------------------------------------------------------- World 1
  // Ramps only. Grid 5 wide, 5 tall (x: 0-4, y: 0-4). The only decision is
  // how many ramps, and which direction, to close the gap between spawn and
  // target.
  {
    id: 'm1-1', world: 1, width: 5, height: 5,
    spawn: { x: 2, y: 0 }, targets: [{ x: 2, y: 4 }],
    slots: 3, palette: ['ramp-left', 'ramp-right'],
    solution: [{ cell: { x: 2, y: 4 }, kind: 'bucket' }],
  },
  {
    id: 'm1-2', world: 1, width: 5, height: 5,
    spawn: { x: 2, y: 0 }, targets: [{ x: 3, y: 4 }],
    slots: 4, palette: ['ramp-left', 'ramp-right'],
    solution: [
      { cell: { x: 2, y: 0 }, kind: 'ramp-right' },
      { cell: { x: 3, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    id: 'm1-3', world: 1, width: 5, height: 5,
    spawn: { x: 2, y: 0 }, targets: [{ x: 0, y: 4 }],
    slots: 5, palette: ['ramp-left', 'ramp-right'],
    solution: [
      { cell: { x: 2, y: 0 }, kind: 'ramp-left' },
      { cell: { x: 1, y: 1 }, kind: 'ramp-left' },
      { cell: { x: 0, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    id: 'm1-4', world: 1, width: 5, height: 5,
    spawn: { x: 1, y: 0 }, targets: [{ x: 3, y: 4 }],
    slots: 5, palette: ['ramp-left', 'ramp-right'],
    solution: [
      { cell: { x: 1, y: 0 }, kind: 'ramp-right' },
      { cell: { x: 2, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 3, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    id: 'm1-5', world: 1, width: 5, height: 5,
    spawn: { x: 0, y: 0 }, targets: [{ x: 4, y: 4 }],
    slots: 7, palette: ['ramp-left', 'ramp-right'],
    solution: [
      { cell: { x: 0, y: 0 }, kind: 'ramp-right' },
      { cell: { x: 1, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 2, y: 2 }, kind: 'ramp-right' },
      { cell: { x: 3, y: 3 }, kind: 'ramp-right' },
      { cell: { x: 4, y: 4 }, kind: 'bucket' },
    ],
  },

  // ---------------------------------------------------------------- World 2
  // Introduces the splitter. Grid 5 wide, 5 tall. One marble becomes two.
  {
    id: 'm2-1', world: 2, width: 5, height: 5,
    spawn: { x: 2, y: 0 }, targets: [{ x: 1, y: 4 }, { x: 3, y: 4 }],
    slots: 5, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 2, y: 0 }, kind: 'splitter' },
      { cell: { x: 1, y: 4 }, kind: 'bucket' },
      { cell: { x: 3, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    id: 'm2-2', world: 2, width: 5, height: 5,
    spawn: { x: 2, y: 0 }, targets: [{ x: 1, y: 4 }, { x: 4, y: 4 }],
    slots: 6, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 2, y: 0 }, kind: 'splitter' },
      { cell: { x: 3, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 1, y: 4 }, kind: 'bucket' },
      { cell: { x: 4, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    id: 'm2-3', world: 2, width: 5, height: 5,
    spawn: { x: 2, y: 0 }, targets: [{ x: 1, y: 4 }, { x: 3, y: 4 }],
    slots: 5, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 2, y: 1 }, kind: 'splitter' },
      { cell: { x: 1, y: 4 }, kind: 'bucket' },
      { cell: { x: 3, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    id: 'm2-4', world: 2, width: 5, height: 5,
    spawn: { x: 2, y: 0 }, targets: [{ x: 0, y: 4 }, { x: 4, y: 4 }],
    slots: 7, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 2, y: 0 }, kind: 'splitter' },
      { cell: { x: 1, y: 1 }, kind: 'ramp-left' },
      { cell: { x: 3, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 0, y: 4 }, kind: 'bucket' },
      { cell: { x: 4, y: 4 }, kind: 'bucket' },
    ],
  },

  // ---------------------------------------------------------------- World 3
  // Two splitters chained. Grid 7 wide (more room to spread targets), 5 tall.
  {
    id: 'm3-1', world: 3, width: 7, height: 5,
    spawn: { x: 3, y: 0 }, targets: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 5, y: 4 }],
    slots: 7, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 3, y: 0 }, kind: 'splitter' },
      { cell: { x: 4, y: 1 }, kind: 'splitter' },
      { cell: { x: 2, y: 4 }, kind: 'bucket' },
      { cell: { x: 3, y: 4 }, kind: 'bucket' },
      { cell: { x: 5, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    id: 'm3-2', world: 3, width: 7, height: 5,
    spawn: { x: 1, y: 0 }, targets: [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 3, y: 4 }],
    slots: 7, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 1, y: 0 }, kind: 'splitter' },
      { cell: { x: 2, y: 1 }, kind: 'splitter' },
      { cell: { x: 0, y: 4 }, kind: 'bucket' },
      { cell: { x: 1, y: 4 }, kind: 'bucket' },
      { cell: { x: 3, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    // The finale: unlike m3-1/m3-2 (only one first-level branch splits
    // again), BOTH branches split a second time here — 1 marble becomes 4,
    // with two of those four naturally landing on the same bucket (a real,
    // deliberate "two different paths, one place" moment, not a bug).
    id: 'm3-3', world: 3, width: 7, height: 5,
    spawn: { x: 3, y: 0 }, targets: [{ x: 1, y: 4 }, { x: 3, y: 4 }, { x: 5, y: 4 }],
    slots: 8, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 3, y: 0 }, kind: 'splitter' },
      { cell: { x: 2, y: 1 }, kind: 'splitter' },
      { cell: { x: 4, y: 1 }, kind: 'splitter' },
      { cell: { x: 1, y: 4 }, kind: 'bucket' },
      { cell: { x: 3, y: 4 }, kind: 'bucket' },
      { cell: { x: 5, y: 4 }, kind: 'bucket' },
    ],
  },
];

export const levelById = (id: string): Level => {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`unknown marble level: ${id}`);
  return level;
};

export const firstLevelId = (): string => LEVELS[0].id;

export const nextLevelId = (id: string): string | null => {
  const index = LEVELS.findIndex((l) => l.id === id);
  return index >= 0 && index < LEVELS.length - 1 ? LEVELS[index + 1].id : null;
};

/** Fewest pieces known to solve the level. Meeting it earns the tidy bonus part. */
export const par = (level: Level): number => level.solution.length;
```

**A note on world 3's geometry, so you can verify the traces yourself before running the test:** in `m3-1`, the first splitter at `(3,0)` clones the spawn marble into `(2,1)` and `(4,1)` on tick 1. The second splitter, placed at `(4,1)`, only affects the marble that's actually there — the `(2,1)` marble has no piece in its cell and just keeps falling straight, reaching `(2,4)`. The `(4,1)` marble hits the second splitter and clones again into `(3,2)` and `(5,2)`, both then falling straight to `(3,4)` and `(5,4)`. Three targets, three buckets, one marble that became three. `m3-2` mirrors this shape starting from a different spawn column, closer to the left edge, to vary the layout.

`m3-3` is the capstone: BOTH of the first splitter's outputs — `(2,1)` and `(4,1)` — hit their own second splitter this time, not just one. That produces four marbles: `(1,2)`/`(3,2)` from the left branch and `(3,2)`/`(5,2)` from the right branch — note `(3,2)` receives one marble from each branch, and since there's no collision handling, both simply continue independently, both eventually landing on the bucket at `(3,4)`. So the final catch is `{'1,4': 1, '3,4': 2, '5,4': 1}` — every target in `level.targets` still has at least one marble (satisfying the win condition), and the doubled catch at `(3,4)` is a deliberate, real "two different paths, one place" moment, not an error to design around.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all 11 new level-content tests green. If "is solvable" fails naming a specific level, retrace that level's geometry by hand against `simulator.ts`'s exact rules and fix the `solution` (or `spawn`/`targets`) — never the test.

- [ ] **Step 5: Commit**

```bash
git add src/engine/marble/levels.ts tests/engine/marble-levels.test.ts
git commit -m "feat(engine): 12 marble levels across three worlds"
```

---

### Task 3: Expand the shared parts catalogue

Three games now draw from one pool: 15 robot + 14 lightbulb + 12 marble levels, each with a possible tidy bonus — up to 82 possible draws against the current 40-part catalogue.

**Files:**
- Modify: `src/engine/parts.ts`
- Modify: `tests/engine/parts.test.ts`

- [ ] **Step 1: Update the test's minimum-count assertion**

In `tests/engine/parts.test.ts`, change:

```ts
  it('has at least as many parts as there are levels to earn them', () => {
    // 15 robot levels + 14 lightbulb levels, each capable of a tidy bonus.
    expect(PARTS.length).toBeGreaterThanOrEqual(29);
  });
```

to:

```ts
  it('has at least as many parts as there are levels to earn them', () => {
    // 15 robot + 14 lightbulb + 12 marble levels, each capable of a tidy bonus.
    expect(PARTS.length).toBeGreaterThanOrEqual(41);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `PARTS.length` is currently 40, less than 41.

- [ ] **Step 3: Append 20 new parts to `src/engine/parts.ts`**

Continue the existing interleaved award-order pattern (one of each slot per round) for five more rounds. Change the `PARTS` array in `src/engine/parts.ts` — append these 20 entries immediately after the existing `{ id: 'arms-fishing', ... }` line (the current last entry), before the closing `];`:

```ts
  { id: 'head-lion', slot: 'head', glyph: '🦁', label: 'a lion head' },
  { id: 'wheels-cupcake', slot: 'wheels', glyph: '🧁', label: 'cupcake wheels' },
  { id: 'antenna-moon', slot: 'antenna', glyph: '🌙', label: 'a moon aerial' },
  { id: 'body-barrel', slot: 'body', glyph: '🛢️', label: 'a barrel body' },
  { id: 'arms-boomerang', slot: 'arms', glyph: '🪃', label: 'boomerang arms' },
  { id: 'head-koala', slot: 'head', glyph: '🐨', label: 'a koala head' },
  { id: 'wheels-cookie', slot: 'wheels', glyph: '🍪', label: 'cookie wheels' },
  { id: 'antenna-sun', slot: 'antenna', glyph: '☀️', label: 'a sun aerial' },
  { id: 'body-cardfile', slot: 'body', glyph: '🗃️', label: 'a card-file body' },
  { id: 'arms-cane', slot: 'arms', glyph: '🦯', label: 'cane arms' },
  { id: 'head-unicorn', slot: 'head', glyph: '🦄', label: 'a unicorn head' },
  { id: 'wheels-chestnut', slot: 'wheels', glyph: '🌰', label: 'chestnut wheels' },
  { id: 'antenna-compass', slot: 'antenna', glyph: '🧭', label: 'a compass aerial' },
  { id: 'body-extinguisher', slot: 'body', glyph: '🧯', label: 'a fire-extinguisher body' },
  { id: 'arms-broom', slot: 'arms', glyph: '🧹', label: 'broom arms' },
  { id: 'head-monkey', slot: 'head', glyph: '🐵', label: 'a monkey head' },
  { id: 'wheels-crystalball', slot: 'wheels', glyph: '🔮', label: 'crystal-ball wheels' },
  { id: 'antenna-ribbon', slot: 'antenna', glyph: '🎗️', label: 'a ribbon aerial' },
  { id: 'body-nestingdoll', slot: 'body', glyph: '🪆', label: 'a nesting-doll body' },
  { id: 'arms-flute', slot: 'arms', glyph: '🪈', label: 'flute arms' },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS. Also run the full parts suite to confirm the new entries satisfy the existing invariants (unique ids, slot-prefixed ids, distinct glyphs):

Run: `npm test -- tests/engine/parts.test.ts`
Expected: PASS — all tests including "has unique ids", "prefixes every part id with its slot", and any glyph-distinctness check.

- [ ] **Step 5: Commit**

```bash
git add src/engine/parts.ts tests/engine/parts.test.ts
git commit -m "feat(engine): expand the parts catalogue for the marble game's awards"
```

---

### Task 4: Progress tracking for marble levels

**Files:**
- Modify: `src/engine/progress.ts`
- Modify: `tests/engine/progress.test.ts`

- [ ] **Step 1: Write the failing test**

Add this import to `tests/engine/progress.test.ts`, alongside the existing `LIGHTBULB_LEVELS`/`firstLightbulbLevelId` import:

```ts
import { LEVELS as MARBLE_LEVELS, firstLevelId as firstMarbleLevelId } from '../../src/engine/marble/levels';
```

Extend the existing combined import from `'../../src/engine/progress'` to also include the two new functions:

```ts
import {
  newProgress, isLevelUnlocked, completeLevel, equippedOrDefault,
  isLightbulbLevelUnlocked, completeLightbulbLevel,
  isMarbleLevelUnlocked, completeMarbleLevel,
} from '../../src/engine/progress';
```

Then append these two new `describe` blocks at the end of the file:

```ts
describe('isMarbleLevelUnlocked', () => {
  it('unlocks the first level immediately', () => {
    expect(isMarbleLevelUnlocked(newProgress(), firstMarbleLevelId())).toBe(true);
  });

  it('locks the second level until the first is complete', () => {
    const p = newProgress();
    expect(isMarbleLevelUnlocked(p, MARBLE_LEVELS[1].id)).toBe(false);
    const after = completeMarbleLevel(p, MARBLE_LEVELS[0].id, 1).progress;
    expect(isMarbleLevelUnlocked(after, MARBLE_LEVELS[1].id)).toBe(true);
  });

  it('keeps a completed level unlocked so it can be replayed', () => {
    const after = completeMarbleLevel(newProgress(), MARBLE_LEVELS[0].id, 1).progress;
    expect(isMarbleLevelUnlocked(after, MARBLE_LEVELS[0].id)).toBe(true);
  });

  it('does not affect or get affected by robot or lightbulb level unlocks', () => {
    const afterRobot = completeLevel(newProgress(), 'w1-1', 2).progress;
    expect(isMarbleLevelUnlocked(afterRobot, MARBLE_LEVELS[1].id)).toBe(false);

    const afterMarble = completeMarbleLevel(newProgress(), MARBLE_LEVELS[0].id, 1).progress;
    expect(isLevelUnlocked(afterMarble, 'w1-2')).toBe(false);
    expect(afterMarble.completedLevels).toEqual([]);
    expect(afterMarble.lightbulbCompletedLevels).toEqual([]);
  });
});

describe('completeMarbleLevel', () => {
  it('records the level and awards one part', () => {
    // m1-1's solution has 1 piece, so par is 1.
    const { progress, earned } = completeMarbleLevel(newProgress(), MARBLE_LEVELS[0].id, 2);
    expect(progress.marbleCompletedLevels).toEqual([MARBLE_LEVELS[0].id]);
    expect(earned).toHaveLength(1);
    expect(progress.parts).toEqual(earned);
  });

  it('awards a second part for solving in par pieces', () => {
    const { progress, earned } = completeMarbleLevel(newProgress(), MARBLE_LEVELS[0].id, 1);
    expect(earned).toHaveLength(2);
    expect(progress.marbleTidyLevels).toEqual([MARBLE_LEVELS[0].id]);
  });

  it('does not award the tidy part for using more pieces than par', () => {
    const { progress, earned } = completeMarbleLevel(newProgress(), MARBLE_LEVELS[0].id, 3);
    expect(earned).toHaveLength(1);
    expect(progress.marbleTidyLevels).toEqual([]);
  });

  it('awards no duplicate part for replaying an already-completed level', () => {
    const first = completeMarbleLevel(newProgress(), MARBLE_LEVELS[0].id, 3).progress;
    const { progress, earned } = completeMarbleLevel(first, MARBLE_LEVELS[0].id, 3);
    expect(earned).toEqual([]);
    expect(progress.marbleCompletedLevels).toEqual([MARBLE_LEVELS[0].id]);
  });

  it('awards the tidy part when a replay improves on a previous scruffy solve', () => {
    const first = completeMarbleLevel(newProgress(), MARBLE_LEVELS[0].id, 3).progress;
    const { progress, earned } = completeMarbleLevel(first, MARBLE_LEVELS[0].id, 1);
    expect(earned).toHaveLength(1);
    expect(progress.marbleTidyLevels).toEqual([MARBLE_LEVELS[0].id]);
  });

  it('never mutates the progress it is given', () => {
    const p = newProgress();
    completeMarbleLevel(p, MARBLE_LEVELS[0].id, 1);
    expect(p.marbleCompletedLevels).toEqual([]);
    expect(p.parts).toEqual([]);
  });

  it('stops awarding once every part is owned', () => {
    const p = { ...newProgress(), parts: [] as string[] };
    // Exhaust the pool via 41 robot/lightbulb/marble-style completions isn't
    // necessary here — completeMarbleLevel only needs an already-full parts
    // array to prove it stops cleanly.
  });

  it('shares one parts pool with robot- and lightbulb-level completions', () => {
    const afterRobot = completeLevel(newProgress(), 'w1-1', 2).progress;
    const { progress, earned } = completeMarbleLevel(afterRobot, MARBLE_LEVELS[0].id, 1);
    // Robot's w1-1 already claimed the first two parts (completion + tidy);
    // the marble award should continue from where that left off, not restart.
    expect(progress.parts).toHaveLength(afterRobot.parts.length + earned.length);
    expect(new Set(progress.parts).size).toBe(progress.parts.length);
  });
});
```

**Fix the placeholder test before running anything** — the `'stops awarding once every part is owned'` test above has a comment but no actual assertion, which is exactly the kind of placeholder this project's plans must never contain. Replace it with a real test using the actual `PARTS` catalogue, matching the pattern already used for `completeLevel`'s and `completeLightbulbLevel`'s equivalent tests elsewhere in this same file (check either of those for the exact style). You'll need `PARTS` imported from `'../../src/engine/parts'` — check whether it's already imported in this file (it should be, from the pre-existing robot/lightbulb exhaustion tests) before adding a new import line for it.

```ts
  it('stops awarding once every part is owned', () => {
    const p = { ...newProgress(), parts: PARTS.map((x) => x.id) };
    const { earned } = completeMarbleLevel(p, MARBLE_LEVELS[0].id, 1);
    expect(earned).toEqual([]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `isMarbleLevelUnlocked`/`completeMarbleLevel` don't exist, and `ProgressState` has no `marbleCompletedLevels`/`marbleTidyLevels` fields.

- [ ] **Step 3: Modify `src/engine/progress.ts`**

Change the imports at the top of the file from:

```ts
import { nextUnearnedPart, type Slot } from './parts';
import { LEVELS, levelById, par } from './robot/levels';
import {
  LEVELS as LIGHTBULB_LEVELS, levelById as lightbulbLevelById, par as lightbulbPar,
} from './lightbulb/levels';
```

to:

```ts
import { nextUnearnedPart, type Slot } from './parts';
import { LEVELS, levelById, par } from './robot/levels';
import {
  LEVELS as LIGHTBULB_LEVELS, levelById as lightbulbLevelById, par as lightbulbPar,
} from './lightbulb/levels';
import {
  LEVELS as MARBLE_LEVELS, levelById as marbleLevelById, par as marblePar,
} from './marble/levels';
```

Change the `ProgressState` interface from:

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
  /** Marble level ids completed at least once. */
  marbleCompletedLevels: string[];
  /** Marble level ids solved in par pieces or fewer. */
  marbleTidyLevels: string[];
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
  lightbulbCompletedLevels: [],
  lightbulbTidyLevels: [],
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
  marbleCompletedLevels: [],
  marbleTidyLevels: [],
  parts: [],
  equipped: {},
});
```

Add these two functions after the existing `completeLightbulbLevel` function (before `equippedOrDefault`):

```ts
/** A marble level is playable once the previous one is complete. The first is always open. */
export const isMarbleLevelUnlocked = (progress: ProgressState, levelId: string): boolean => {
  const index = MARBLE_LEVELS.findIndex((l) => l.id === levelId);
  if (index <= 0) return index === 0;
  return progress.marbleCompletedLevels.includes(MARBLE_LEVELS[index - 1].id);
};

/**
 * Records a solved marble level and awards parts: one for finishing, plus
 * one more for using no more pieces than par. Mirrors completeLevel and
 * completeLightbulbLevel exactly, kept as a separate function rather than a
 * shared generic — see the plan for why (ProgressState is the real, saved
 * shape of a player's file; a generic accessor over its fields would lose
 * the compiler's ability to catch a wrong-field mistake).
 */
export const completeMarbleLevel = (
  progress: ProgressState,
  levelId: string,
  piecesUsed: number,
): { progress: ProgressState; earned: string[] } => {
  const level = marbleLevelById(levelId);
  const firstCompletion = !progress.marbleCompletedLevels.includes(levelId);
  const tidy = piecesUsed <= marblePar(level);
  const firstTidy = tidy && !progress.marbleTidyLevels.includes(levelId);

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
      marbleCompletedLevels: firstCompletion
        ? [...progress.marbleCompletedLevels, levelId]
        : progress.marbleCompletedLevels,
      marbleTidyLevels: firstTidy
        ? [...progress.marbleTidyLevels, levelId]
        : progress.marbleTidyLevels,
      parts: owned,
    },
    earned,
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all existing robot- and lightbulb-progress tests still green (confirming those fields/functions are untouched), plus all new marble-progress tests green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/progress.ts tests/engine/progress.test.ts
git commit -m "feat(engine): progress tracking, unlocks and awards for marble levels"
```

---

### Task 5: Engine barrel

**Files:**
- Modify: `src/engine/index.ts`

- [ ] **Step 1: Update the barrel**

The robot and lightbulb exports keep their existing names — nothing that already imports from this barrel changes. Marble's equivalents get distinct, prefixed names to avoid colliding with the robot game's already-bare-exported `run` and `Cell`/`Level` types. Change `src/engine/index.ts` from:

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

export { run as runMarble } from './marble/simulator';
export type {
  Cell as MarbleCell, MarblePiece, MarblePieceKind, Level as MarbleLevel,
  TickState as MarbleTickState, Trace as MarbleTrace,
} from './marble/types';
export {
  LEVELS as MARBLE_LEVELS, levelById as marbleLevelById,
  firstLevelId as firstMarbleLevelId, nextLevelId as marbleNextLevelId,
  par as marblePar,
} from './marble/levels';

export { PARTS, SLOTS, partById, partsInSlot, nextUnearnedPart } from './parts';
export type { Part, Slot } from './parts';

export {
  newProgress, isLevelUnlocked, completeLevel,
  isLightbulbLevelUnlocked, completeLightbulbLevel,
  isMarbleLevelUnlocked, completeMarbleLevel, equippedOrDefault,
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
git commit -m "feat(engine): export marble module and progress functions from the barrel"
```

---

### Task 6: Persist and sanitize marble progress

**Files:**
- Modify: `src/platform/storage.ts`
- Modify: `tests/engine/storage.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/engine/storage.test.ts`, inside the existing `describe('storage', ...)` block (after the last existing `it`, before the block's closing):

```ts
  it('drops unknown marble level ids while keeping valid ones', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1,
      completedLevels: [],
      tidyLevels: [],
      lightbulbCompletedLevels: [],
      lightbulbTidyLevels: [],
      marbleCompletedLevels: ['m1-1', 'no-such-marble-level'],
      marbleTidyLevels: ['m1-1', 'no-such-marble-level'],
      parts: [],
      equipped: {},
    }));
    const loaded = loadProgress();
    expect(loaded.marbleCompletedLevels).toEqual(['m1-1']);
    expect(loaded.marbleTidyLevels).toEqual(['m1-1']);
  });

  it('backfills marble fields missing from an older save', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1, completedLevels: [], tidyLevels: [], parts: [], equipped: {},
    }));
    const loaded = loadProgress();
    expect(loaded.marbleCompletedLevels).toEqual([]);
    expect(loaded.marbleTidyLevels).toEqual([]);
  });

  it('drops a valid robot id found in a marble field, and vice versa', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1,
      completedLevels: ['m1-1'],
      tidyLevels: [],
      lightbulbCompletedLevels: [],
      lightbulbTidyLevels: [],
      marbleCompletedLevels: ['w1-1'],
      marbleTidyLevels: [],
      parts: [],
      equipped: {},
    }));
    const loaded = loadProgress();
    // 'm1-1' is a real marble id, not a robot one — must be dropped from completedLevels.
    expect(loaded.completedLevels).toEqual([]);
    // 'w1-1' is a real robot id, not a marble one — must be dropped from marbleCompletedLevels.
    expect(loaded.marbleCompletedLevels).toEqual([]);
  });
```

The third test directly guards against the exact mistake a later edit could make: accidentally wiring `sanitizeMarbleLevelIds` to the wrong validity `Set`. It deliberately uses ids that are genuinely valid — just in the wrong game's field — so a swapped `Set` would incorrectly keep them instead of dropping them. (This mirrors a test added to the lightbulb game's storage coverage for the same reason — check `tests/engine/storage.test.ts`'s existing `'drops a valid robot id found in a lightbulb field, and vice versa'` test if you want to see the precedent.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — a save with no `marbleCompletedLevels`/`marbleTidyLevels` at all currently round-trips as `undefined`, not `[]`, and an unknown/wrong-catalogue marble level id isn't filtered out.

- [ ] **Step 3: Modify `src/platform/storage.ts`**

Change the import line from:

```ts
import { newProgress, LEVELS, LIGHTBULB_LEVELS, PARTS, type ProgressState, type Slot } from '../engine';
```

to:

```ts
import { newProgress, LEVELS, LIGHTBULB_LEVELS, MARBLE_LEVELS, PARTS, type ProgressState, type Slot } from '../engine';
```

Change:

```ts
const validLevelIds = new Set(LEVELS.map((l) => l.id));
const validLightbulbLevelIds = new Set(LIGHTBULB_LEVELS.map((l) => l.id));
const validPartIds = new Set(PARTS.map((p) => p.id));

/** Keeps only ids present in the given valid-id set. */
const sanitizeIds = (ids: unknown, valid: Set<string>): string[] =>
  Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && valid.has(id)) : [];

/** Keeps only ids that exist in the current robot LEVELS catalogue. */
const sanitizeRobotLevelIds = (ids: unknown): string[] => sanitizeIds(ids, validLevelIds);

/** Keeps only ids that exist in the current lightbulb LEVELS catalogue. */
const sanitizeLightbulbLevelIds = (ids: unknown): string[] => sanitizeIds(ids, validLightbulbLevelIds);

/** Keeps only ids that exist in the current PARTS catalogue. */
const sanitizePartIds = (ids: unknown): string[] => sanitizeIds(ids, validPartIds);
```

to:

```ts
const validLevelIds = new Set(LEVELS.map((l) => l.id));
const validLightbulbLevelIds = new Set(LIGHTBULB_LEVELS.map((l) => l.id));
const validMarbleLevelIds = new Set(MARBLE_LEVELS.map((l) => l.id));
const validPartIds = new Set(PARTS.map((p) => p.id));

/** Keeps only ids present in the given valid-id set. */
const sanitizeIds = (ids: unknown, valid: Set<string>): string[] =>
  Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && valid.has(id)) : [];

/** Keeps only ids that exist in the current robot LEVELS catalogue. */
const sanitizeRobotLevelIds = (ids: unknown): string[] => sanitizeIds(ids, validLevelIds);

/** Keeps only ids that exist in the current lightbulb LEVELS catalogue. */
const sanitizeLightbulbLevelIds = (ids: unknown): string[] => sanitizeIds(ids, validLightbulbLevelIds);

/** Keeps only ids that exist in the current marble LEVELS catalogue. */
const sanitizeMarbleLevelIds = (ids: unknown): string[] => sanitizeIds(ids, validMarbleLevelIds);

/** Keeps only ids that exist in the current PARTS catalogue. */
const sanitizePartIds = (ids: unknown): string[] => sanitizeIds(ids, validPartIds);
```

Update the sanitization block inside `loadProgress` from:

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

to:

```ts
    return {
      ...newProgress(),
      ...parsed,
      completedLevels: sanitizeRobotLevelIds(parsed.completedLevels),
      tidyLevels: sanitizeRobotLevelIds(parsed.tidyLevels),
      lightbulbCompletedLevels: sanitizeLightbulbLevelIds(parsed.lightbulbCompletedLevels),
      lightbulbTidyLevels: sanitizeLightbulbLevelIds(parsed.lightbulbTidyLevels),
      marbleCompletedLevels: sanitizeMarbleLevelIds(parsed.marbleCompletedLevels),
      marbleTidyLevels: sanitizeMarbleLevelIds(parsed.marbleTidyLevels),
      parts: sanitizePartIds(parsed.parts),
      equipped: sanitizeEquipped(parsed.equipped),
    };
```

`sanitizeEquipped` stays exactly as it is — untouched, it already only checks part ids.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — every existing storage test still green plus the three new marble tests.

- [ ] **Step 5: Commit**

```bash
git add src/platform/storage.ts tests/engine/storage.test.ts
git commit -m "feat(platform): sanitize marble progress fields on load"
```

---

### Task 7: MarbleGrid — the board

Pure presentational component, mirrors `src/ui/robot/GridWorld.svelte`'s role exactly: props in, SVG out, no state of its own.

**Files:**
- Create: `src/ui/marble/MarbleGrid.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import type { MarbleCell, MarbleLevel, MarblePiece, MarblePieceKind } from '../../engine';

  let {
    level,
    pieces,
    marbles,
  }: {
    level: MarbleLevel;
    pieces: MarblePiece[];
    marbles: MarbleCell[];
  } = $props();

  const cells = $derived(
    Array.from({ length: level.width * level.height }, (_, i) => ({
      x: i % level.width,
      y: Math.floor(i / level.width),
    })),
  );

  const isTarget = (x: number, y: number) => level.targets.some((t) => t.x === x && t.y === y);

  const GLYPH: Record<MarblePieceKind, string> = {
    'ramp-left': '↙️',
    'ramp-right': '↘️',
    splitter: '🔀',
    bucket: '🪣',
  };
</script>

<svg class="grid" viewBox="0 0 {level.width} {level.height}" role="img" aria-label="the marble board">
  {#each cells as cell (`${cell.x},${cell.y}`)}
    <rect
      x={cell.x + 0.03} y={cell.y + 0.03} width="0.94" height="0.94" rx="0.1"
      class="cell" class:target={isTarget(cell.x, cell.y)}
    />
  {/each}

  {#each pieces as piece (`${piece.cell.x},${piece.cell.y}`)}
    <text
      x={piece.cell.x + 0.5} y={piece.cell.y + 0.5}
      class="piece" text-anchor="middle" dominant-baseline="central"
    >{GLYPH[piece.kind]}</text>
  {/each}

  {#each marbles as marble, i (i)}
    <circle cx={marble.x + 0.5} cy={marble.y + 0.5} r="0.14" class="marble" />
  {/each}
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

  .cell.target {
    stroke: var(--accent);
    stroke-width: 0.05;
    stroke-dasharray: 0.08 0.06;
  }

  .piece { font-size: 0.6px; }

  .marble { fill: var(--accent); }
</style>
```

**Why marbles are keyed by array index, not by cell position (unlike the robot game's grid cells, which are keyed by their fixed `x,y`):** the robot game only ever animates ONE robot sliding smoothly between cells via a CSS transform transition. Marbles here are different — a single marble can multiply into two at a splitter, and the whole `marbles` array is wholesale-replaced every tick, so there's no continuous identity to preserve between ticks the way the robot has. Rendering each tick's positions fresh, keyed by index, with no CSS transition, is correct and deliberately simpler — a discrete flip-book rather than a smooth slide.

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/ui/marble/MarbleGrid.svelte
git commit -m "feat(ui): marble board — cells, targets, placed pieces, marbles"
```

---

### Task 8: MarbleMachine — the play screen

This is the heart of the game, mirroring `RobotLevel.svelte`'s build-then-run shape (unlike the lightbulb game's live auto-solve). The `onDestroy` teardown guard is present from the start, for the same reason it was in `LightbulbMachine.svelte`: this component's async win sequence (`speak()` → `await wait(...)` → fire a callback) can outlive the component if the child navigates away mid-celebration, and Svelte does not cancel in-flight promises on teardown.

**Files:**
- Create: `src/ui/marble/MarbleMachine.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import MarbleGrid from './MarbleGrid.svelte';
  import {
    runMarble, marblePar,
    type MarbleCell, type MarbleLevel, type MarblePiece, type MarblePieceKind,
  } from '../../engine';
  import { speak } from '../../platform/speech';

  let {
    level,
    onsolved,
    onback,
  }: {
    level: MarbleLevel;
    onsolved: (piecesUsed: number) => void;
    onback: () => void;
  } = $props();

  const STEP_MS = 420;

  let pieces: MarblePiece[] = $state([]);
  let selected: MarblePieceKind | null = $state(null);
  let marbles: MarbleCell[] = $state([]);
  let running = $state(false);
  let solved = $state(false);

  // Same guard already required in RobotLevel.svelte and LightbulbMachine.svelte:
  // the async speak/wait/onsolved sequence below outlives this component if the
  // child navigates away mid-celebration, and Svelte tearing a component down
  // does not cancel in-flight promises or pending setTimeouts.
  let destroyed = false;
  onDestroy(() => { destroyed = true; });

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const reset = () => {
    pieces = [];
    selected = null;
    marbles = [{ ...level.spawn }];
    running = false;
    solved = false;
  };

  // Starting a different level clears everything.
  $effect(() => {
    level.id;
    reset();
  });

  const full = $derived(pieces.length >= level.slots);

  const pick = (kind: MarblePieceKind) => {
    if (running) return;
    selected = selected === kind ? null : kind;
  };

  const tapCell = (x: number, y: number) => {
    if (running) return;
    const existing = pieces.find((p) => p.cell.x === x && p.cell.y === y);
    if (existing) {
      pieces = pieces.filter((p) => p !== existing);
      return;
    }
    if (!selected || full) return;
    pieces = [...pieces, { cell: { x, y }, kind: selected }];
  };

  const clear = () => {
    if (running) return;
    pieces = [];
  };

  const play = async () => {
    if (running || pieces.length === 0) return;
    running = true;
    marbles = [{ ...level.spawn }];
    await wait(120);
    if (destroyed) return;

    const trace = runMarble(level, pieces);

    for (const tick of trace.ticks) {
      marbles = tick.marbles;
      await wait(STEP_MS);
      if (destroyed) return;
    }

    const won = level.targets.every((t) => (trace.caught[`${t.x},${t.y}`] ?? 0) > 0);

    if (won) {
      solved = true;
      speak('You did it!');
      await wait(900);
      if (destroyed) return;
      onsolved(pieces.length);
    } else {
      running = false;
      speak('Not quite. Try moving a piece.');
    }
  };
</script>

<section class="machine">
  <header>
    <button
      type="button" class="back" disabled={running}
      onclick={onback} aria-label="back to the levels"
    >⬅️</button>
    <span class="par" aria-hidden="true">⭐ {marblePar(level)}</span>
  </header>

  <div class="board" class:solved>
    <MarbleGrid {level} {pieces} {marbles} />
  </div>

  <div class="palette">
    {#each level.palette as kind (kind)}
      <button
        type="button"
        class="piece-btn"
        class:on={selected === kind}
        disabled={running || (full && selected !== kind)}
        onclick={() => pick(kind)}
        aria-label="{kind.replace('-', ' ')}, {selected === kind ? 'selected' : 'not selected'}"
      >{{ 'ramp-left': '↙️', 'ramp-right': '↘️', splitter: '🔀' }[kind]}</button>
    {/each}
    <button
      type="button"
      class="piece-btn"
      class:on={selected === 'bucket'}
      disabled={running || (full && selected !== 'bucket')}
      onclick={() => pick('bucket')}
      aria-label="bucket, {selected === 'bucket' ? 'selected' : 'not selected'}"
    >🪣</button>
  </div>

  <div class="board-tap" role="presentation">
    {#each Array(level.width * level.height) as _, i (i)}
      <button
        type="button"
        class="cell-hit"
        style="left: {(i % level.width) * (100 / level.width)}%; top: {Math.floor(i / level.width) * (100 / level.height)}%; width: {100 / level.width}%; height: {100 / level.height}%;"
        disabled={running}
        onclick={() => tapCell(i % level.width, Math.floor(i / level.width))}
        aria-label="cell {i % level.width}, {Math.floor(i / level.width)}"
      ></button>
    {/each}
  </div>

  <div class="actions">
    <button
      type="button" class="clear" disabled={running}
      onclick={clear} aria-label="clear the board"
    >🗑️</button>
    <button
      type="button" class="play" disabled={running || pieces.length === 0}
      onclick={play} aria-label="run the marble"
    >▶</button>
  </div>
</section>

<style>
  .machine {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    height: 100svh;
    padding: 0.5rem;
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

  .board {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    max-width: 380px;
    min-height: 0;
  }

  .board.solved { animation: cheer 0.5s ease; }

  @keyframes cheer {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .board-tap {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .cell-hit {
    position: absolute;
    pointer-events: auto;
    background: transparent;
  }

  .palette {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .piece-btn {
    min-width: 3.6rem;
    min-height: 3.6rem;
    border-radius: 18px;
    background: var(--card-bg);
    border: 2px solid var(--border);
    font-size: 1.6rem;
  }

  .piece-btn.on { border-color: var(--accent); background: var(--accent-bg); }
  .piece-btn:active:not(:disabled) { transform: scale(0.94); }
  .piece-btn:disabled { opacity: 0.4; }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .clear {
    min-width: 4.2rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--card-bg);
    font-size: 1.6rem;
  }

  .clear:disabled { opacity: 0.35; }
  .clear:active:not(:disabled) { transform: scale(0.93); }

  .play {
    min-width: 5.5rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--accent);
    color: #1b1b23;
    font-size: 2rem;
    box-shadow: var(--shadow);
  }

  .play:disabled { opacity: 0.35; }
  .play:active:not(:disabled) { transform: scale(0.93); }
</style>
```

**Why the grid-cell tap targets are a separate absolutely-positioned overlay** (`.board-tap`/`.cell-hit`), rather than click handlers on `MarbleGrid`'s SVG elements directly: `MarbleGrid` is deliberately kept pure-presentational (props in, SVG out, no interaction) exactly like `GridWorld.svelte`, so it stays trivially reusable and testable in isolation. `MarbleMachine` owns the tap interaction by laying an invisible grid of real `<button>` elements directly over the rendered SVG board, positioned with percentage-based CSS matching the grid's cell layout exactly (`level.width`/`level.height` cells, computed the same way `MarbleGrid`'s own `cells` derivation does).

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors, no warnings.

**If `check` reports a syntax error around the palette glyph lookup** (`{{ 'ramp-left': '↙️', ... }[kind]}`), that's because Svelte template expressions can't always parse an inline object literal cleanly inside `{...}` the way plain TypeScript can — if you hit this, replace it with a small helper function in the `<script>` block instead:

```ts
  const PIECE_GLYPH: Record<Exclude<MarblePieceKind, 'bucket'>, string> = {
    'ramp-left': '↙️',
    'ramp-right': '↘️',
    splitter: '🔀',
  };
```

and reference `{PIECE_GLYPH[kind]}` in the template in place of the inline object literal. Use whichever form actually compiles cleanly; the helper-function form is the safer default if you're unsure, and matches the style already used for glyph lookups in `ArrowPad.svelte`/`ProgramStrip.svelte` in the robot game.

- [ ] **Step 3: Commit**

```bash
git add src/ui/marble/MarbleMachine.svelte
git commit -m "feat(ui): marble play screen — palette, tap-to-place, run and animate"
```

---

### Task 9: MarbleBench — level select

**Files:**
- Create: `src/ui/marble/MarbleBench.svelte`

- [ ] **Step 1: Write the component**

Mirrors `RobotBench.svelte`/`LightbulbBench.svelte` exactly, grouped by `world` instead of `stage`. No bonus mode for this game (unlike the lightbulb game's count-up toy) — the spec doesn't call for one, so this stays a direct, unembellished level grid.

```svelte
<script lang="ts">
  import { MARBLE_LEVELS, isMarbleLevelUnlocked, type ProgressState } from '../../engine';

  let {
    progress,
    onplay,
    onback,
  }: {
    progress: ProgressState;
    onplay: (levelId: string) => void;
    onback: () => void;
  } = $props();

  const WORLD_GLYPH = ['', '↘️', '🔀', '🔀🔀'];

  const worlds = $derived(
    [1, 2, 3].map((world) => ({
      world,
      levels: MARBLE_LEVELS.filter((l) => l.world === world),
    })),
  );

  const state = (id: string): 'tidy' | 'done' | 'open' | 'locked' => {
    if (progress.marbleTidyLevels.includes(id)) return 'tidy';
    if (progress.marbleCompletedLevels.includes(id)) return 'done';
    return isMarbleLevelUnlocked(progress, id) ? 'open' : 'locked';
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

  .world-glyph { font-size: 1.4rem; }

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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/ui/marble/MarbleBench.svelte
git commit -m "feat(ui): marble level select with lock and completion state"
```

---

### Task 10: Unlock the Marble Machine on Home

This is the last locked bench — after this task, every tile on the home screen is live.

**Files:**
- Modify: `src/ui/Home.svelte`

- [ ] **Step 1: Change the marble bench from locked to live**

Change `src/ui/Home.svelte`'s script block from:

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

to:

```svelte
<script lang="ts">
  let {
    partCount,
    onrobot,
    onlightbulb,
    onmarble,
    ongarage,
  }: {
    partCount: number;
    onrobot: () => void;
    onlightbulb: () => void;
    onmarble: () => void;
    ongarage: () => void;
  } = $props();
</script>
```

Change the marble button from:

```svelte
    <button type="button" class="bench locked" disabled aria-label="marble machine, locked">
      <span class="glyph">⚙️</span>
      <span class="lock" aria-hidden="true">🔒</span>
    </button>
```

to:

```svelte
    <button type="button" class="bench" onclick={onmarble} aria-label="marble machine">
      <span class="glyph">⚙️</span>
    </button>
```

The `.bench.locked`/`.lock` style rules can stay in the file even though nothing uses them anymore — removing dead CSS is out of scope for this task, and a future game might need them again. Every style rule otherwise stays exactly as it is.

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: this will FAIL here, on purpose, until Task 11 updates `App.svelte` to pass the new `onmarble` prop `Home` now requires — exactly the same two-step sequence already used when the lightbulb bench was unlocked. Confirm the failure is specifically about a missing `onmarble` prop on `Home`'s usage in `App.svelte`, then proceed to Task 11.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Home.svelte
git commit -m "feat(ui): unlock the marble machine bench on the home screen"
```

---

### Task 11: Wire up App routing

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
  import MarbleBench from './marble/MarbleBench.svelte';
  import MarbleMachine from './marble/MarbleMachine.svelte';
  import { loadProgress, saveProgress, type LoadedProgress } from '../platform/storage';
  import { speak } from '../platform/speech';
  import {
    completeLevel, completeLightbulbLevel, completeMarbleLevel,
    equippedOrDefault, levelById, lightbulbLevelById, marbleLevelById,
    nextLevelId, lightbulbNextLevelId, marbleNextLevelId, partById,
    type ProgressState, type Slot,
  } from '../engine';

  type Screen =
    | 'home' | 'garage'
    | 'robot-bench' | 'robot-level'
    | 'lightbulb-bench' | 'lightbulb-level' | 'lightbulb-countup'
    | 'marble-bench' | 'marble-level';

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

  const openMarbleLevel = (id: string) => {
    currentLevelId = id;
    screen = 'marble-level';
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

  const marbleSolved = (piecesUsed: number) => {
    if (!currentLevelId) return;
    const { progress: next, earned } = completeMarbleLevel(progress, currentLevelId, piecesUsed);
    update(next);
    if (!award(earned)) goToNextMarbleLevel();
  };

  const goToNextMarbleLevel = () => {
    const next = currentLevelId ? marbleNextLevelId(currentLevelId) : null;
    if (next) currentLevelId = next;
    else screen = 'marble-bench';
  };

  const dismissAward = () => {
    awarded = [];
    if (screen === 'robot-level') goToNextRobotLevel();
    else if (screen === 'lightbulb-level') goToNextLightbulbLevel();
    else if (screen === 'marble-level') goToNextMarbleLevel();
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
    onmarble={() => (screen = 'marble-bench')}
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
{:else if screen === 'marble-bench'}
  <MarbleBench {progress} onplay={openMarbleLevel} onback={() => (screen = 'home')} />
{:else if screen === 'marble-level' && currentLevelId}
  <MarbleMachine
    level={marbleLevelById(currentLevelId)}
    onsolved={marbleSolved}
    onback={() => (screen = 'marble-bench')}
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
```

- [ ] **Step 2: Verify everything type-checks and tests still pass**

Run: `npm run check`
Expected: no errors, no warnings — resolves Task 10's expected failure.

Run: `npm test`
Expected: PASS — every engine test green.

- [ ] **Step 3: Play it locally**

Run: `npm run dev`

Using the browser's device toolbar set to iPhone 13 mini (375×812), or via whatever browser automation you have available:
- Home shows all three benches live; nothing is locked anymore.
- Opening the marble bench shows only `m1-1` unlocked.
- Opening `m1-1` shows a 5×5 board, spawn marker implicit at the top, a single dashed-highlighted target cell near the bottom, a palette of ramp-left/ramp-right/bucket, and clear/play buttons.
- Tap the bucket palette button, then tap the target cell — a bucket icon appears there.
- Tap ▶ — the marble animates falling straight down and lands on the bucket; "You did it!" plays; after the pause, the award pop-up appears.
- Dismissing the award advances to `m1-2` automatically.
- Both other games (already shipped) still work exactly as before — solve one level of each and confirm the award/progression flow is unaffected by this change.
- Fully reload the page and confirm all three games' unlocked/completed state survived independently (check `localStorage['cog-workshop:progress']` directly if useful).

- [ ] **Step 4: Commit**

```bash
git add src/ui/App.svelte
git commit -m "feat(ui): route to the marble machine, the last locked bench"
```

---

### Task 12: Ship it

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README status**

Replace the `## Status` section of `README.md` with:

```markdown
## Status

🤖💡⚙️ **v1 complete** — the shared shell and all three games: Teach the
Robot (15 levels, four worlds), the Lightbulb Machine (14 levels, four
stages, plus a counting-pattern bonus mode), and the Marble Machine (12
levels, three worlds).

**Play:** https://maxvdp-irl.github.io/cog-workshop/
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: mark the marble machine as shipped — v1 complete"
```

- [ ] **Step 3: Test on the real devices**

Open the deployed URL on the iPhone 13 mini and the Galaxy S20 once this is live. This is the test the unit suite cannot do.

Check:
- [ ] Palette buttons and grid-cell tap targets are comfortably hittable with a 5-year-old's finger — the invisible per-cell overlay buttons in particular are worth double-checking, since they're not visually obvious the way the palette buttons are.
- [ ] Nothing requires reading beyond icons already established elsewhere in the app.
- [ ] The marble's tick-by-tick fall is easy to follow and not too fast — if it feels rushed, raise the `420` ms `STEP_MS` in `MarbleMachine.svelte`.
- [ ] A splitter's "one marble becomes two" moment reads clearly, not confusingly.
- [ ] Tapping an already-placed piece genuinely removes it (the "tap to clear" interaction), and tapping an empty cell with nothing selected in the palette does nothing (no confusing dead click).
- [ ] Spoken audio plays (remember: iOS Safari stays silent on the very first tap of a session).
- [ ] Closing and reopening the app preserves all three games' progress independently.

- [ ] **Step 4: Watch Oskar play, and change nothing while he does**

Specifically worth noting:
- Does he understand "select a piece, then tap where it goes" as two separate steps, or does he expect tapping the grid to do something before selecting anything?
- Does he predict where the marble will land before pressing play, or does he mostly experiment and watch?
- What does he make of a splitter — does "one marble becomes two" land as delightful, confusing, or unremarkable?
- Of the three games, which does he return to on his own? That's real signal for what a v2 (real marble physics, more games, deeper worlds) should prioritize.

Record what you observe in the repo — with all three games now shipped, this is the input for any v2 planning, not just tuning this one game.

---

## Plan Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Discrete grid, tap-to-place, no physics | 1, 8 |
| Palette: ramp-left, ramp-right, splitter, bucket | 1, 7, 8 |
| Marbles advance cell by cell on a fixed tick, deterministic | 1 |
| No gravity simulation, no collision handling | 1 (context section), simulator design |
| Splitter: one marble in, one on each side (halving/doubling observable) | 1, 2 (design-decision notes) |
| Goal: route marbles into the correct buckets | 1, 8 |
| Same build-it/run-it/watch-it/fix-it loop as the robot game | 8 (mirrors RobotLevel.svelte) |
| Fully unit-testable simulation, no browser needed | 1 |
| Shared reward loop (robot parts, garage) — not a separate currency | 4, 6 |
| No buzzers/lives/timers, unlimited retries, a miss is information | 1 (falling-off is silent), 8 (no failure state) |
| Marble Machine unlocked on Home — the last locked bench | 10, 11 |
| Backward compatibility with existing (robot + lightbulb) save data | 4, 6 (context section) |
| Engine tests: a given board produces exact expected per-bucket counts | 1 |
| Content validity: every shipped level solvable within its slot limit | 2 |

**Placeholder scan:** the one placeholder caught during self-review (`'stops awarding once every part is owned'` having a comment but no assertion, copy-pasted from an earlier draft) is fixed inline in Task 4 — the task now shows the exact correct test and explicitly calls out replacing the placeholder before running anything. No other TBDs, no "add error handling," no undefined-function references remain.

**Type consistency:** `MarblePiece`/`MarblePieceKind`/`MarbleLevel`/`MarbleCell`/`MarbleTrace`/`MarbleTickState` are defined once in Task 1 and re-exported under those exact prefixed names from the barrel in Task 5 — every later task (7, 8, 9, 11) imports them that way, never as the bare `Cell`/`Level`/`Trace`/`Piece`, which stay the robot game's types. `runMarble`/`marblePar`/`marbleLevelById`/`firstMarbleLevelId`/`marbleNextLevelId` are defined in Tasks 1–2, barrel-exported with those names in Task 5, and consumed with those exact names in Tasks 4, 8, 9, 11. `completeMarbleLevel`'s return shape (`{ progress, earned }`) matches `completeLevel`'s and `completeLightbulbLevel`'s exactly, and `App.svelte` destructures all three the same way in Task 11. `isMarbleLevelUnlocked`/`marbleCompletedLevels`/`marbleTidyLevels` are introduced in Task 4 and used consistently through Tasks 6, 9, 11.
