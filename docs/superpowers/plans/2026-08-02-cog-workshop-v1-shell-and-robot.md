# Cog Workshop v1 — Shared Shell + Teach the Robot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable, deployed PWA containing the shared app shell (home screen, robot-parts reward loop, garage, progress storage) and the complete Teach the Robot game across four worlds.

**Architecture:** All game rules live in a pure-TypeScript `src/engine/` with no DOM access, consumed by Svelte 5 components in `src/ui/` through a narrow barrel export. The robot simulator is a pure function — `run(level, program, mini)` returns a deterministic execution trace — so the UI's job is only to animate a trace it is handed, and every rule is unit-testable without a browser. `src/platform/` isolates localStorage and speech synthesis. This mirrors the sibling `number-islands` repo exactly.

**Tech Stack:** TypeScript, Vite, Svelte 5 (runes), Vitest, vite-plugin-pwa, GitHub Actions → GitHub Pages.

**Spec:** [docs/superpowers/specs/2026-08-02-cog-workshop-design.md](../specs/2026-08-02-cog-workshop-design.md)

**Reference implementation:** the `number-islands` repo (local path `C:\Users\TLN-TEST-310\.claude\projects\Maths app`). When this plan is ambiguous about style, match that repo.

---

## Context you need before starting

**Who this is for.** Oskar is 5. He can read a few simple words — "go", "stop", "next" — and nothing more. Every instruction must be an icon, an animation, or spoken audio. No text-only affordance may be the sole way to understand a screen.

**Device.** iPhone 13 mini (375×812 CSS px) and Galaxy S20. Portrait only. Finger input. Minimum tap target 64×64 px; primary action buttons 84×84 px or larger. Assume the smallest screen and design up.

**Tone.** No buzzers, no lives, no timers, no failure states. A crash is information, not a penalty. Never block progress on a wrong answer.

**Grid coordinate convention used throughout this plan.** `x` is the column, increasing to the **right**, starting at 0. `y` is the row, increasing **downward**, starting at 0. Therefore `'up'` decreases `y`, `'down'` increases `y`, `'left'` decreases `x`, `'right'` increases `x`. This convention matches SVG, which is what the grid renders to. Get this wrong and every level is mirrored.

**The one pedagogy rule you must not break.** In worlds 1 and 2 there is **no turn instruction**. An arrow tile *is* a move: `{ kind: 'move', dir: 'left' }` moves the robot one cell toward the left of the screen regardless of which way the robot sprite is pointing. The robot sprite may rotate to face its direction of travel, but that is decoration — no rule and no puzzle may depend on the robot's facing. Do not add a `facing` field to the robot state. Relative turning is deliberately out of scope for v1.

**Deliberate simplification — no nesting.** A `repeat` tile's body contains only move tiles. A mini-program's body contains only move tiles. Nothing may contain a `repeat` inside a `repeat`, or a `mini` inside a `mini`. This is enforced by the type definitions in Task 3, which is why the simulator needs no recursion guard and no depth limit. Do not "improve" this by generalising it.

---

## File Structure

```
cog-workshop/
├── index.html                          entry HTML, portrait meta, theme colour
├── package.json                        scripts: dev/build/preview/check/test
├── vite.config.ts                      base path, Svelte, PWA, Vitest include
├── svelte.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .github/workflows/deploy.yml        test → build → Pages
├── public/favicon.svg
├── src/
│   ├── main.ts                         mounts App
│   ├── app.css                         CSS custom properties, resets, button base
│   ├── engine/                         PURE TYPESCRIPT — no DOM, no imports from ui/ or platform/
│   │   ├── index.ts                    barrel — the only thing ui/ may import from
│   │   ├── parts.ts                    robot part catalogue + award logic
│   │   ├── progress.ts                 ProgressState, unlocks, level completion
│   │   └── robot/
│   │       ├── types.ts                Direction, Cell, Instruction, Level, Trace
│   │       ├── simulator.ts            run() — program + level → deterministic trace
│   │       └── levels.ts               all level content, worlds 1–4
│   ├── platform/
│   │   ├── storage.ts                  versioned localStorage load/save
│   │   └── speech.ts                   speechSynthesis wrapper, never fatal
│   └── ui/
│       ├── App.svelte                  screen router + persistence
│       ├── Home.svelte                 three bench tiles
│       ├── Garage.svelte               earned parts, assemble a robot
│       └── robot/
│           ├── RobotBench.svelte       level select with lock state
│           ├── RobotLevel.svelte       the play screen — owns run animation
│           ├── GridWorld.svelte        SVG grid, walls, goal, robot
│           ├── ProgramStrip.svelte     the program tiles
│           └── ArrowPad.svelte         arrow / repeat / mini / play buttons
└── tests/
    └── engine/
        ├── simulator.test.ts
        ├── levels.test.ts
        ├── parts.test.ts
        ├── progress.test.ts
        └── storage.test.ts
```

**Why `engine/robot/` is a subfolder** when number-islands has a flat `engine/`: two more games are coming, each with its own rules. Keeping `robot/` self-contained now means the Lightbulb and Marble engines drop in beside it without a later reshuffle. `parts.ts` and `progress.ts` stay at the top level because all three games share them.

**Import direction is one-way:** `ui/` → `engine/` and `ui/` → `platform/`. The engine imports nothing from `ui/` or `platform/`. If you find yourself wanting `localStorage` inside `engine/`, you have put the code in the wrong place.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `svelte.config.js`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `public/favicon.svg`, `src/main.ts`, `src/app.css`, `src/ui/App.svelte`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "cog-workshop",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.app.json && tsc -p tsconfig.node.json",
    "test": "vitest run --passWithNoTests"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^7.1.2",
    "@tsconfig/svelte": "^5.0.8",
    "@types/node": "^24.13.2",
    "@vitest/ui": "^4.1.10",
    "svelte": "^5.56.4",
    "svelte-check": "^4.7.1",
    "typescript": "~6.0.2",
    "vite": "^8.1.1",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Create the TypeScript and Svelte configs**

`svelte.config.js`:

```js
/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {}
```

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "module": "esnext",
    "types": ["svelte", "vite/client"],
    "allowArbitraryExtensions": true,
    "noEmit": true,
    "allowJs": true,
    "checkJs": true,
    "moduleDetection": "force"
  },
  "include": ["src/**/*.ts", "src/**/*.js", "src/**/*.svelte"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "svelte.config.js"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

The `base` must be `/cog-workshop/` on build — GitHub Pages serves the site from a subpath, and getting this wrong produces a blank page with 404s on every asset.

```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cog-workshop/' : '/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cog Workshop',
        short_name: 'CogWorkshop',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f5a524',
        background_color: '#1b1b23',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
}));
```

- [ ] **Step 4: Create `index.html`**

`maximum-scale=1` stops iOS zooming when a button is double-tapped, which otherwise ruins a tap-heavy game.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <meta name="theme-color" content="#f5a524" />
    <title>Cog Workshop</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1b1b23"/>
  <circle cx="32" cy="32" r="13" fill="none" stroke="#f5a524" stroke-width="6"/>
  <g fill="#f5a524">
    <rect x="28" y="6" width="8" height="10" rx="2"/>
    <rect x="28" y="48" width="8" height="10" rx="2"/>
    <rect x="48" y="28" width="10" height="8" rx="2"/>
    <rect x="6" y="28" width="10" height="8" rx="2"/>
  </g>
</svg>
```

- [ ] **Step 6: Create `src/app.css`**

Dark workshop palette. `touch-action: manipulation` disables the 300 ms double-tap-to-zoom delay; `user-select: none` stops long-press selecting text on the tiles.

```css
:root {
  font-size: 18px;

  --text: #e8e6ef;
  --text-h: #ffffff;
  --bg: #1b1b23;
  --card-bg: #262631;
  --border: #3a3a49;
  --accent: #f5a524;
  --accent-bg: rgba(245, 165, 36, 0.15);
  --good: #4ade80;
  --crash: #fb7185;
  --shadow: rgba(0, 0, 0, 0.45) 0 10px 15px -3px, rgba(0, 0, 0, 0.3) 0 4px 6px -2px;

  --sans: system-ui, 'Segoe UI', Roboto, sans-serif;

  font-family: var(--sans);
  color-scheme: dark;
  color: var(--text);
  background: var(--bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100svh;
  overscroll-behavior: none;
}

body {
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}

#app { width: 100%; min-height: 100svh; }

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 7: Create `src/main.ts` and a placeholder `src/ui/App.svelte`**

`src/main.ts`:

```ts
import { mount } from 'svelte'
import './app.css'
import App from './ui/App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
```

`src/ui/App.svelte`:

```svelte
<script lang="ts">
</script>

<main>
  <h1>Cog Workshop</h1>
</main>

<style>
  main {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100svh;
  }
  h1 { color: var(--accent); }
</style>
```

- [ ] **Step 8: Install and verify the toolchain**

Run: `npm install`
Expected: completes, `node_modules/` created.

Run: `npm run build`
Expected: build succeeds, `dist/` created, no errors.

Run: `npm test`
Expected: PASS — "No test files found, exiting with code 0" (that is what `--passWithNoTests` is for; there are no tests yet).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Svelte 5 + TypeScript + Vitest project"
```

---

### Task 2: Deploy pipeline

Do this second, not last. Getting the URL live while the app is still a placeholder proves the Pages path works, so a deploy failure surfaces now rather than on the day you want to hand Oskar a phone.

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/deploy.yml package-lock.json
git commit -m "ci: deploy to GitHub Pages via GitHub Actions"
git push origin main
```

- [ ] **Step 3: Enable Pages and verify the deploy**

In the GitHub repo settings, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. This is a one-time manual step; the workflow cannot set it for you.

Run: `gh run watch`
Expected: both `build` and `deploy` jobs succeed.

Then open `https://maxvdp-irl.github.io/cog-workshop/`
Expected: the words "Cog Workshop" in orange. If you get a blank page, check the browser console for 404s on `/assets/…` — that means `base` in `vite.config.ts` is wrong.

---

### Task 3: Robot types and basic movement

**Files:**
- Create: `src/engine/robot/types.ts`, `src/engine/robot/simulator.ts`
- Test: `tests/engine/simulator.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/engine/simulator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { run } from '../../src/engine/robot/simulator';
import type { Level } from '../../src/engine/robot/types';

// A 3-wide, 3-tall open room. Robot bottom-left, goal bottom-right.
const room: Level = {
  id: 'test-room',
  world: 2,
  width: 3,
  height: 3,
  start: { x: 0, y: 2 },
  goal: { x: 2, y: 2 },
  walls: [],
  slots: 6,
  arrows: ['up', 'down', 'left', 'right'],
  repeatAllowed: false,
  miniSlots: 0,
  solution: [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'right' }],
};

describe('run — basic movement', () => {
  it('does nothing for an empty program', () => {
    const trace = run(room, []);
    expect(trace.steps).toEqual([]);
    expect(trace.end).toEqual({ x: 0, y: 2 });
    expect(trace.status).toBe('stopped');
    expect(trace.crashAt).toBeNull();
  });

  it('moves right and reaches the goal', () => {
    const trace = run(room, [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'right' }]);
    expect(trace.status).toBe('goal');
    expect(trace.end).toEqual({ x: 2, y: 2 });
    expect(trace.steps).toHaveLength(2);
    expect(trace.steps[0]).toEqual({
      path: [0], from: { x: 0, y: 2 }, to: { x: 1, y: 2 }, outcome: 'moved',
    });
  });

  it('treats up as decreasing y and down as increasing y', () => {
    const up = run(room, [{ kind: 'move', dir: 'up' }]);
    expect(up.end).toEqual({ x: 0, y: 1 });
    const down = run({ ...room, start: { x: 0, y: 0 } }, [{ kind: 'move', dir: 'down' }]);
    expect(down.end).toEqual({ x: 0, y: 1 });
  });

  it('stops at the goal without running later tiles', () => {
    const trace = run(room, [
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'up' },
    ]);
    expect(trace.status).toBe('goal');
    expect(trace.steps).toHaveLength(2);
  });

  it('crashes into the grid edge and reports the offending tile', () => {
    const trace = run(room, [{ kind: 'move', dir: 'left' }]);
    expect(trace.status).toBe('crashed');
    expect(trace.crashAt).toEqual([0]);
    expect(trace.end).toEqual({ x: 0, y: 2 });
    expect(trace.steps[0].outcome).toBe('blocked');
  });

  it('crashes into a wall and halts the rest of the program', () => {
    const walled: Level = { ...room, walls: [{ x: 1, y: 2 }] };
    const trace = run(walled, [
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
    ]);
    expect(trace.status).toBe('crashed');
    expect(trace.crashAt).toEqual([0]);
    expect(trace.steps).toHaveLength(1);
    expect(trace.end).toEqual({ x: 0, y: 2 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/engine/robot/simulator`.

- [ ] **Step 3: Write `src/engine/robot/types.ts`**

Note the type structure: `repeat` and `mini` bodies accept `MoveInstruction[]` only, which makes nesting unrepresentable rather than merely discouraged.

```ts
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  x: number; // column, 0 at the left, increasing rightwards
  y: number; // row, 0 at the top, increasing downwards
}

/** A single step. The arrow IS the move — there is no turn instruction. */
export interface MoveInstruction {
  kind: 'move';
  dir: Direction;
}

/** Runs its body `times` times. Body holds moves only — repeats never nest. */
export interface RepeatInstruction {
  kind: 'repeat';
  times: number;
  body: MoveInstruction[];
}

/** Invokes the level's mini-program. The mini body holds moves only. */
export interface MiniInstruction {
  kind: 'mini';
}

export type Instruction = MoveInstruction | RepeatInstruction | MiniInstruction;

export interface Level {
  id: string;
  world: 1 | 2 | 3 | 4;
  width: number;
  height: number;
  start: Cell;
  goal: Cell;
  walls: Cell[];
  /** Capacity of the program strip, counted in top-level tiles. */
  slots: number;
  /** Which arrow buttons this level offers. World 1 offers exactly one. */
  arrows: Direction[];
  repeatAllowed: boolean;
  /** Capacity of the mini-program strip. 0 means this level has no mini-program. */
  miniSlots: number;
  /**
   * A known-good program. Used by the content test to prove the level is
   * solvable, and its top-level tile count defines par for the tidy bonus.
   */
  solution: Instruction[];
  /** Mini-program body the solution assumes. Required when miniSlots > 0. */
  solutionMini?: MoveInstruction[];
}

export type StepOutcome = 'moved' | 'blocked';

export interface TraceStep {
  /**
   * Index path to the tile that produced this step, for UI highlighting.
   * `[2]` is top-level tile 2. `[2, 1]` is body tile 1 inside the repeat at
   * top-level index 2. `[3, 0]` is body tile 0 of the mini invoked at index 3.
   */
  path: number[];
  from: Cell;
  to: Cell;
  outcome: StepOutcome;
}

export interface Trace {
  steps: TraceStep[];
  end: Cell;
  status: 'goal' | 'crashed' | 'stopped';
  /** Index path of the tile that crashed, or null. */
  crashAt: number[] | null;
}
```

- [ ] **Step 4: Write `src/engine/robot/simulator.ts`**

Handles moves only for now; `repeat` and `mini` are added in Tasks 4 and 5.

```ts
import type { Cell, Direction, Instruction, Level, MoveInstruction, Trace, TraceStep } from './types';

const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

const blocked = (level: Level, cell: Cell): boolean =>
  cell.x < 0 || cell.y < 0 || cell.x >= level.width || cell.y >= level.height ||
  level.walls.some((w) => same(w, cell));

/**
 * Executes a program against a level, returning a deterministic trace.
 * Execution halts on reaching the goal or on the first blocked move.
 */
export const run = (level: Level, program: Instruction[]): Trace => {
  const steps: TraceStep[] = [];
  let at: Cell = { ...level.start };

  const applyMove = (move: MoveInstruction, path: number[]): 'goal' | 'crashed' | 'ok' => {
    const delta = DELTA[move.dir];
    const to: Cell = { x: at.x + delta.x, y: at.y + delta.y };
    if (blocked(level, to)) {
      steps.push({ path, from: at, to: at, outcome: 'blocked' });
      return 'crashed';
    }
    steps.push({ path, from: at, to, outcome: 'moved' });
    at = to;
    return same(at, level.goal) ? 'goal' : 'ok';
  };

  for (let i = 0; i < program.length; i++) {
    const instruction = program[i];
    if (instruction.kind === 'move') {
      const result = applyMove(instruction, [i]);
      if (result === 'goal') return { steps, end: at, status: 'goal', crashAt: null };
      if (result === 'crashed') return { steps, end: at, status: 'crashed', crashAt: [i] };
    }
  }

  return { steps, end: at, status: 'stopped', crashAt: null };
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 6 tests in `simulator.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/engine/robot/types.ts src/engine/robot/simulator.ts tests/engine/simulator.test.ts
git commit -m "feat(engine): robot types and move execution with crash traces"
```

---

### Task 4: Repeat tiles

**Files:**
- Modify: `src/engine/robot/simulator.ts`
- Test: `tests/engine/simulator.test.ts` (append a new `describe` block)

- [ ] **Step 1: Write the failing test**

Append to `tests/engine/simulator.test.ts`:

```ts
describe('run — repeat', () => {
  // A 1-wide, 6-tall corridor. Robot at the bottom, goal at the top.
  const corridor: Level = {
    id: 'test-corridor',
    world: 3,
    width: 1,
    height: 6,
    start: { x: 0, y: 5 },
    goal: { x: 0, y: 0 },
    walls: [],
    slots: 2,
    arrows: ['up'],
    repeatAllowed: true,
    miniSlots: 0,
    solution: [{ kind: 'repeat', times: 5, body: [{ kind: 'move', dir: 'up' }] }],
  };

  it('expands a repeat into one step per iteration', () => {
    const trace = run(corridor, [
      { kind: 'repeat', times: 5, body: [{ kind: 'move', dir: 'up' }] },
    ]);
    expect(trace.status).toBe('goal');
    expect(trace.steps).toHaveLength(5);
    expect(trace.end).toEqual({ x: 0, y: 0 });
  });

  it('paths repeat body steps as [tileIndex, bodyIndex]', () => {
    const trace = run(corridor, [
      { kind: 'repeat', times: 2, body: [{ kind: 'move', dir: 'up' }] },
    ]);
    expect(trace.steps.map((s) => s.path)).toEqual([[0, 0], [0, 0]]);
  });

  it('runs a multi-move body in order each iteration', () => {
    const room: Level = {
      ...corridor, width: 3, height: 3,
      start: { x: 0, y: 2 }, goal: { x: 2, y: 0 }, arrows: ['up', 'right'],
      solution: [{ kind: 'repeat', times: 2, body: [
        { kind: 'move', dir: 'right' }, { kind: 'move', dir: 'up' },
      ] }],
    };
    const trace = run(room, [{ kind: 'repeat', times: 2, body: [
      { kind: 'move', dir: 'right' }, { kind: 'move', dir: 'up' },
    ] }]);
    expect(trace.status).toBe('goal');
    expect(trace.steps.map((s) => s.path)).toEqual([[0, 0], [0, 1], [0, 0], [0, 1]]);
    expect(trace.end).toEqual({ x: 2, y: 0 });
  });

  it('crashes mid-repeat and reports the body tile that failed', () => {
    const trace = run(corridor, [
      { kind: 'repeat', times: 9, body: [{ kind: 'move', dir: 'up' }] },
    ]);
    // Reaches the goal on the 5th iteration, so it never gets to crash.
    expect(trace.status).toBe('goal');

    const noGoal: Level = { ...corridor, goal: { x: 0, y: 99 } };
    const crash = run(noGoal, [
      { kind: 'repeat', times: 9, body: [{ kind: 'move', dir: 'up' }] },
    ]);
    expect(crash.status).toBe('crashed');
    expect(crash.crashAt).toEqual([0, 0]);
    expect(crash.end).toEqual({ x: 0, y: 0 });
  });

  it('treats a zero-times repeat as a no-op', () => {
    const trace = run(corridor, [{ kind: 'repeat', times: 0, body: [{ kind: 'move', dir: 'up' }] }]);
    expect(trace.steps).toEqual([]);
    expect(trace.status).toBe('stopped');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — repeat tiles are ignored, so `trace.steps` is empty and status is `stopped` rather than `goal`.

- [ ] **Step 3: Add repeat handling to the simulator**

In `src/engine/robot/simulator.ts`, replace the `for` loop body with:

```ts
  for (let i = 0; i < program.length; i++) {
    const instruction = program[i];

    if (instruction.kind === 'move') {
      const result = applyMove(instruction, [i]);
      if (result === 'goal') return { steps, end: at, status: 'goal', crashAt: null };
      if (result === 'crashed') return { steps, end: at, status: 'crashed', crashAt: [i] };
    }

    if (instruction.kind === 'repeat') {
      for (let iteration = 0; iteration < instruction.times; iteration++) {
        for (let b = 0; b < instruction.body.length; b++) {
          const result = applyMove(instruction.body[b], [i, b]);
          if (result === 'goal') return { steps, end: at, status: 'goal', crashAt: null };
          if (result === 'crashed') return { steps, end: at, status: 'crashed', crashAt: [i, b] };
        }
      }
    }
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/robot/simulator.ts tests/engine/simulator.test.ts
git commit -m "feat(engine): repeat tiles expand to one trace step per iteration"
```

---

### Task 5: Mini-programs

**Files:**
- Modify: `src/engine/robot/simulator.ts`
- Test: `tests/engine/simulator.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `tests/engine/simulator.test.ts`:

```ts
describe('run — mini-programs', () => {
  // A 4x4 room. Robot bottom-left, goal top-right, reached by three
  // right-then-up staircases.
  const stairs: Level = {
    id: 'test-stairs',
    world: 4,
    width: 4,
    height: 4,
    start: { x: 0, y: 3 },
    goal: { x: 3, y: 0 },
    walls: [],
    slots: 3,
    arrows: ['up', 'right'],
    repeatAllowed: false,
    miniSlots: 2,
    solution: [{ kind: 'mini' }, { kind: 'mini' }, { kind: 'mini' }],
    solutionMini: [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'up' }],
  };

  const mini: MoveInstruction[] = [
    { kind: 'move', dir: 'right' },
    { kind: 'move', dir: 'up' },
  ];

  it('runs the mini body each time the mini tile appears', () => {
    const trace = run(stairs, [{ kind: 'mini' }, { kind: 'mini' }, { kind: 'mini' }], mini);
    expect(trace.status).toBe('goal');
    expect(trace.steps).toHaveLength(6);
    expect(trace.end).toEqual({ x: 3, y: 0 });
  });

  it('paths mini body steps as [tileIndex, bodyIndex]', () => {
    const trace = run(stairs, [{ kind: 'mini' }, { kind: 'mini' }], mini);
    expect(trace.steps.map((s) => s.path)).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
  });

  it('treats an empty or absent mini body as a no-op', () => {
    expect(run(stairs, [{ kind: 'mini' }], []).steps).toEqual([]);
    expect(run(stairs, [{ kind: 'mini' }]).steps).toEqual([]);
  });

  it('crashes inside a mini and reports the body tile that failed', () => {
    const trace = run(stairs, [{ kind: 'mini' }], [{ kind: 'move', dir: 'left' }]);
    expect(trace.status).toBe('crashed');
    expect(trace.crashAt).toEqual([0, 0]);
  });
});
```

Add `MoveInstruction` to the type import at the top of the file:

```ts
import type { Level, MoveInstruction } from '../../src/engine/robot/types';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `run` takes two arguments, and mini tiles are ignored.

- [ ] **Step 3: Add the mini parameter and handling**

Change the `run` signature in `src/engine/robot/simulator.ts`:

```ts
export const run = (
  level: Level,
  program: Instruction[],
  mini: MoveInstruction[] = [],
): Trace => {
```

Then add this branch inside the `for` loop, after the `repeat` branch:

```ts
    if (instruction.kind === 'mini') {
      for (let b = 0; b < mini.length; b++) {
        const result = applyMove(mini[b], [i, b]);
        if (result === 'goal') return { steps, end: at, status: 'goal', crashAt: null };
        if (result === 'crashed') return { steps, end: at, status: 'crashed', crashAt: [i, b] };
      }
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/robot/simulator.ts tests/engine/simulator.test.ts
git commit -m "feat(engine): mini-program tiles"
```

---

### Task 6: Level content and the solvability guarantee

Every level ships with a known-good `solution`. The content test runs each one through the simulator and asserts it reaches the goal within the slot limit. That is what makes "an unsolvable level never ships" an automated guarantee rather than a hope.

**Files:**
- Create: `src/engine/robot/levels.ts`
- Test: `tests/engine/levels.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/engine/levels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LEVELS, levelById, firstLevelId, nextLevelId, par } from '../../src/engine/robot/levels';
import { run } from '../../src/engine/robot/simulator';

describe('level content', () => {
  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders levels by world, never going backwards', () => {
    const worlds = LEVELS.map((l) => l.world);
    expect([...worlds].sort((a, b) => a - b)).toEqual(worlds);
  });

  it('starts in world 1 with a single arrow direction', () => {
    const first = levelById(firstLevelId());
    expect(first.world).toBe(1);
    expect(first.arrows).toHaveLength(1);
  });

  it('offers exactly one arrow in every world 1 level', () => {
    for (const level of LEVELS.filter((l) => l.world === 1)) {
      expect(level.arrows).toHaveLength(1);
    }
  });

  it('never offers a repeat tile before world 3', () => {
    for (const level of LEVELS.filter((l) => l.world < 3)) {
      expect(level.repeatAllowed).toBe(false);
    }
  });

  it('never offers a mini-program before world 4', () => {
    for (const level of LEVELS.filter((l) => l.world < 4)) {
      expect(level.miniSlots).toBe(0);
    }
  });

  it('is solvable within its slot limit', () => {
    for (const level of LEVELS) {
      const trace = run(level, level.solution, level.solutionMini ?? []);
      expect(trace.status, `${level.id} should reach the goal`).toBe('goal');
      expect(level.solution.length, `${level.id} solution exceeds its slots`)
        .toBeLessThanOrEqual(level.slots);
    }
  });

  it('only uses arrows the level offers', () => {
    for (const level of LEVELS) {
      const dirs: string[] = [];
      for (const tile of level.solution) {
        if (tile.kind === 'move') dirs.push(tile.dir);
        if (tile.kind === 'repeat') dirs.push(...tile.body.map((m) => m.dir));
      }
      for (const m of level.solutionMini ?? []) dirs.push(m.dir);
      for (const dir of dirs) {
        expect(level.arrows, `${level.id} uses ${dir}`).toContain(dir);
      }
    }
  });

  it('keeps start, goal and walls inside the grid, and start clear of walls', () => {
    for (const level of LEVELS) {
      for (const cell of [level.start, level.goal, ...level.walls]) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(level.width);
        expect(cell.y).toBeLessThan(level.height);
      }
      expect(level.walls.some((w) => w.x === level.start.x && w.y === level.start.y)).toBe(false);
      expect(level.walls.some((w) => w.x === level.goal.x && w.y === level.goal.y)).toBe(false);
    }
  });

  it('requires a mini body wherever miniSlots is set', () => {
    for (const level of LEVELS.filter((l) => l.miniSlots > 0)) {
      expect(level.solutionMini, `${level.id} needs solutionMini`).toBeDefined();
      expect(level.solutionMini!.length).toBeLessThanOrEqual(level.miniSlots);
    }
  });

  it('derives par from the solution tile count', () => {
    expect(par(levelById(firstLevelId()))).toBe(levelById(firstLevelId()).solution.length);
  });

  it('chains levels in order and ends with null', () => {
    let id: string | null = firstLevelId();
    let count = 0;
    while (id) { count++; id = nextLevelId(id); }
    expect(count).toBe(LEVELS.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/engine/robot/levels`.

- [ ] **Step 3: Write `src/engine/robot/levels.ts`**

Remember the coordinate convention: `y` increases downward, so `start: { x: 0, y: 4 }` on a 5-tall grid is the bottom row.

```ts
import type { Level } from './types';

/**
 * Levels in play order. A level is unlocked when the previous one is complete,
 * so this array's order IS the progression.
 */
export const LEVELS: Level[] = [
  // ---------------------------------------------------------------- World 1
  // One arrow only. The single decision is how many steps.
  {
    id: 'w1-1', world: 1, width: 5, height: 3,
    start: { x: 0, y: 1 }, goal: { x: 2, y: 1 }, walls: [],
    slots: 4, arrows: ['right'], repeatAllowed: false, miniSlots: 0,
    solution: [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'right' }],
  },
  {
    id: 'w1-2', world: 1, width: 5, height: 3,
    start: { x: 0, y: 1 }, goal: { x: 4, y: 1 }, walls: [],
    slots: 5, arrows: ['right'], repeatAllowed: false, miniSlots: 0,
    solution: Array.from({ length: 4 }, () => ({ kind: 'move', dir: 'right' as const })),
  },
  {
    id: 'w1-3', world: 1, width: 3, height: 5,
    start: { x: 1, y: 4 }, goal: { x: 1, y: 1 }, walls: [],
    slots: 4, arrows: ['up'], repeatAllowed: false, miniSlots: 0,
    solution: Array.from({ length: 3 }, () => ({ kind: 'move', dir: 'up' as const })),
  },
  {
    id: 'w1-4', world: 1, width: 6, height: 3,
    start: { x: 0, y: 1 }, goal: { x: 5, y: 1 }, walls: [],
    slots: 6, arrows: ['right'], repeatAllowed: false, miniSlots: 0,
    solution: Array.from({ length: 5 }, () => ({ kind: 'move', dir: 'right' as const })),
  },

  // ---------------------------------------------------------------- World 2
  // All four arrows. Corners, then obstacles.
  {
    id: 'w2-1', world: 2, width: 4, height: 4,
    start: { x: 0, y: 3 }, goal: { x: 3, y: 0 }, walls: [],
    slots: 8, arrows: ['up', 'down', 'left', 'right'], repeatAllowed: false, miniSlots: 0,
    solution: [
      ...Array.from({ length: 3 }, () => ({ kind: 'move', dir: 'right' as const })),
      ...Array.from({ length: 3 }, () => ({ kind: 'move', dir: 'up' as const })),
    ],
  },
  {
    id: 'w2-2', world: 2, width: 4, height: 4,
    start: { x: 0, y: 3 }, goal: { x: 3, y: 3 },
    walls: [{ x: 2, y: 3 }],
    slots: 8, arrows: ['up', 'down', 'left', 'right'], repeatAllowed: false, miniSlots: 0,
    solution: [
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'up' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'down' },
    ],
  },
  {
    id: 'w2-3', world: 2, width: 5, height: 5,
    start: { x: 0, y: 4 }, goal: { x: 4, y: 4 },
    walls: [{ x: 2, y: 4 }, { x: 2, y: 3 }],
    slots: 10, arrows: ['up', 'down', 'left', 'right'], repeatAllowed: false, miniSlots: 0,
    solution: [
      { kind: 'move', dir: 'up' },
      { kind: 'move', dir: 'up' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'down' },
      { kind: 'move', dir: 'down' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
    ],
  },
  {
    id: 'w2-4', world: 2, width: 5, height: 5,
    start: { x: 0, y: 0 }, goal: { x: 4, y: 4 },
    walls: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }],
    slots: 10, arrows: ['up', 'down', 'left', 'right'], repeatAllowed: false, miniSlots: 0,
    solution: [
      ...Array.from({ length: 4 }, () => ({ kind: 'move', dir: 'right' as const })),
      ...Array.from({ length: 4 }, () => ({ kind: 'move', dir: 'down' as const })),
    ],
  },

  // ---------------------------------------------------------------- World 3
  // Slots are deliberately too few for one-tile-per-step. Repeat is the way.
  {
    id: 'w3-1', world: 3, width: 1, height: 6,
    start: { x: 0, y: 5 }, goal: { x: 0, y: 0 }, walls: [],
    slots: 2, arrows: ['up'], repeatAllowed: true, miniSlots: 0,
    solution: [{ kind: 'repeat', times: 5, body: [{ kind: 'move', dir: 'up' }] }],
  },
  {
    id: 'w3-2', world: 3, width: 7, height: 3,
    start: { x: 0, y: 1 }, goal: { x: 6, y: 1 }, walls: [],
    slots: 2, arrows: ['right'], repeatAllowed: true, miniSlots: 0,
    solution: [{ kind: 'repeat', times: 6, body: [{ kind: 'move', dir: 'right' }] }],
  },
  {
    id: 'w3-3', world: 3, width: 5, height: 5,
    start: { x: 0, y: 4 }, goal: { x: 4, y: 0 }, walls: [],
    slots: 3, arrows: ['up', 'right'], repeatAllowed: true, miniSlots: 0,
    solution: [
      { kind: 'repeat', times: 4, body: [{ kind: 'move', dir: 'right' }] },
      { kind: 'repeat', times: 4, body: [{ kind: 'move', dir: 'up' }] },
    ],
  },
  {
    id: 'w3-4', world: 3, width: 5, height: 5,
    start: { x: 0, y: 4 }, goal: { x: 4, y: 0 }, walls: [],
    slots: 2, arrows: ['up', 'right'], repeatAllowed: true, miniSlots: 0,
    solution: [
      { kind: 'repeat', times: 4, body: [
        { kind: 'move', dir: 'right' }, { kind: 'move', dir: 'up' },
      ] },
    ],
  },

  // ---------------------------------------------------------------- World 4
  // Name a small sequence once, use it several times.
  {
    id: 'w4-1', world: 4, width: 4, height: 4,
    start: { x: 0, y: 3 }, goal: { x: 3, y: 0 }, walls: [],
    slots: 3, arrows: ['up', 'right'], repeatAllowed: false, miniSlots: 2,
    solution: [{ kind: 'mini' }, { kind: 'mini' }, { kind: 'mini' }],
    solutionMini: [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'up' }],
  },
  {
    id: 'w4-2', world: 4, width: 5, height: 5,
    start: { x: 0, y: 4 }, goal: { x: 4, y: 0 }, walls: [],
    slots: 4, arrows: ['up', 'right'], repeatAllowed: false, miniSlots: 2,
    solution: [{ kind: 'mini' }, { kind: 'mini' }, { kind: 'mini' }, { kind: 'mini' }],
    solutionMini: [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'up' }],
  },
  {
    id: 'w4-3', world: 4, width: 7, height: 3,
    start: { x: 0, y: 1 }, goal: { x: 6, y: 1 }, walls: [],
    slots: 3, arrows: ['right'], repeatAllowed: false, miniSlots: 2,
    solution: [{ kind: 'mini' }, { kind: 'mini' }, { kind: 'mini' }],
    solutionMini: [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'right' }],
  },
];

export const levelById = (id: string): Level => {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`unknown level: ${id}`);
  return level;
};

export const firstLevelId = (): string => LEVELS[0].id;

export const nextLevelId = (id: string): string | null => {
  const index = LEVELS.findIndex((l) => l.id === id);
  return index >= 0 && index < LEVELS.length - 1 ? LEVELS[index + 1].id : null;
};

/** Fewest top-level tiles known to solve the level. Meeting it earns the tidy bonus part. */
export const par = (level: Level): number => level.solution.length;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all level tests green. If "is solvable within its slot limit" fails, the named level's `solution` does not actually reach its goal — fix the level data, never the test.

- [ ] **Step 5: Commit**

```bash
git add src/engine/robot/levels.ts tests/engine/levels.test.ts
git commit -m "feat(engine): 15 robot levels across four worlds with solvability tests"
```

---

### Task 7: Robot parts catalogue and awards

**Files:**
- Create: `src/engine/parts.ts`
- Test: `tests/engine/parts.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/engine/parts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PARTS, partById, partsInSlot, nextUnearnedPart, SLOTS } from '../../src/engine/parts';

describe('parts catalogue', () => {
  it('has unique ids', () => {
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only uses known slots', () => {
    for (const part of PARTS) expect(SLOTS).toContain(part.slot);
  });

  it('offers at least two choices in every slot, so the garage is worth visiting', () => {
    for (const slot of SLOTS) expect(partsInSlot(slot).length).toBeGreaterThanOrEqual(2);
  });

  it('has at least as many parts as there are levels to earn them', () => {
    expect(PARTS.length).toBeGreaterThanOrEqual(15);
  });

  it('looks a part up by id', () => {
    expect(partById(PARTS[0].id)).toEqual(PARTS[0]);
  });

  it('throws on an unknown id', () => {
    expect(() => partById('nope')).toThrow();
  });
});

describe('nextUnearnedPart', () => {
  it('returns the first part when nothing is owned', () => {
    expect(nextUnearnedPart([])).toBe(PARTS[0].id);
  });

  it('skips parts already owned', () => {
    expect(nextUnearnedPart([PARTS[0].id])).toBe(PARTS[1].id);
  });

  it('returns null once everything is owned', () => {
    expect(nextUnearnedPart(PARTS.map((p) => p.id))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/engine/parts`.

- [ ] **Step 3: Write `src/engine/parts.ts`**

Parts are emoji so v1 needs no art pipeline. Each has a `label` used only for spoken audio, never as required reading.

```ts
export const SLOTS = ['head', 'body', 'wheels', 'arms', 'antenna'] as const;

export type Slot = (typeof SLOTS)[number];

export interface Part {
  id: string;
  slot: Slot;
  /** Rendered directly in the garage and the award pop-up. */
  glyph: string;
  /** Spoken aloud when earned. Never the only way to understand the screen. */
  label: string;
}

/**
 * Award order. Parts are earned in this sequence, one per level completed,
 * plus one extra for each level solved in par tiles.
 */
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
  { id: 'arms-rocket', slot: 'arms', glyph: '🎈', label: 'balloon arms' },
];

export const partById = (id: string): Part => {
  const part = PARTS.find((p) => p.id === id);
  if (!part) throw new Error(`unknown part: ${id}`);
  return part;
};

export const partsInSlot = (slot: Slot): Part[] => PARTS.filter((p) => p.slot === slot);

/** The next part to award, or null when everything has been earned. */
export const nextUnearnedPart = (owned: string[]): string | null =>
  PARTS.find((p) => !owned.includes(p.id))?.id ?? null;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/parts.ts tests/engine/parts.test.ts
git commit -m "feat(engine): robot parts catalogue and award ordering"
```

---

### Task 8: Progress state, unlocks and level completion

**Files:**
- Create: `src/engine/progress.ts`
- Test: `tests/engine/progress.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/engine/progress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newProgress, isLevelUnlocked, completeLevel, equippedOrDefault } from '../../src/engine/progress';
import { LEVELS, firstLevelId } from '../../src/engine/robot/levels';
import { PARTS } from '../../src/engine/parts';

describe('newProgress', () => {
  it('starts with nothing earned and nothing equipped', () => {
    const p = newProgress();
    expect(p.version).toBe(1);
    expect(p.completedLevels).toEqual([]);
    expect(p.tidyLevels).toEqual([]);
    expect(p.parts).toEqual([]);
    expect(p.equipped).toEqual({});
  });
});

describe('isLevelUnlocked', () => {
  it('unlocks the first level immediately', () => {
    expect(isLevelUnlocked(newProgress(), firstLevelId())).toBe(true);
  });

  it('locks the second level until the first is complete', () => {
    const p = newProgress();
    expect(isLevelUnlocked(p, LEVELS[1].id)).toBe(false);
    const after = completeLevel(p, LEVELS[0].id, 2).progress;
    expect(isLevelUnlocked(after, LEVELS[1].id)).toBe(true);
  });

  it('keeps a completed level unlocked so it can be replayed', () => {
    const after = completeLevel(newProgress(), LEVELS[0].id, 2).progress;
    expect(isLevelUnlocked(after, LEVELS[0].id)).toBe(true);
  });
});

describe('completeLevel', () => {
  it('records the level and awards one part', () => {
    const { progress, earned } = completeLevel(newProgress(), LEVELS[0].id, 3);
    expect(progress.completedLevels).toEqual([LEVELS[0].id]);
    expect(earned).toEqual([PARTS[0].id]);
    expect(progress.parts).toEqual([PARTS[0].id]);
  });

  it('awards a second part for solving in par tiles', () => {
    // LEVELS[0].solution has 2 tiles, so par is 2.
    const { progress, earned } = completeLevel(newProgress(), LEVELS[0].id, 2);
    expect(earned).toHaveLength(2);
    expect(progress.tidyLevels).toEqual([LEVELS[0].id]);
  });

  it('does not award the tidy part for a longer solution', () => {
    const { progress, earned } = completeLevel(newProgress(), LEVELS[0].id, 4);
    expect(earned).toHaveLength(1);
    expect(progress.tidyLevels).toEqual([]);
  });

  it('awards no duplicate part for replaying a level already completed', () => {
    const first = completeLevel(newProgress(), LEVELS[0].id, 4).progress;
    const { progress, earned } = completeLevel(first, LEVELS[0].id, 4);
    expect(earned).toEqual([]);
    expect(progress.completedLevels).toEqual([LEVELS[0].id]);
    expect(progress.parts).toHaveLength(1);
  });

  it('awards the tidy part when a replay improves on a previous scruffy solve', () => {
    const first = completeLevel(newProgress(), LEVELS[0].id, 4).progress;
    const { progress, earned } = completeLevel(first, LEVELS[0].id, 2);
    expect(earned).toHaveLength(1);
    expect(progress.tidyLevels).toEqual([LEVELS[0].id]);
  });

  it('never mutates the progress it is given', () => {
    const p = newProgress();
    completeLevel(p, LEVELS[0].id, 2);
    expect(p.completedLevels).toEqual([]);
    expect(p.parts).toEqual([]);
  });

  it('stops awarding once every part is owned', () => {
    let p = { ...newProgress(), parts: PARTS.map((x) => x.id) };
    const { earned } = completeLevel(p, LEVELS[0].id, 2);
    expect(earned).toEqual([]);
  });
});

describe('equippedOrDefault', () => {
  it('falls back to the first owned part in a slot', () => {
    const p = { ...newProgress(), parts: ['head-classic'] };
    expect(equippedOrDefault(p, 'head')).toBe('head-classic');
  });

  it('prefers an explicit choice', () => {
    const p = { ...newProgress(), parts: ['head-classic', 'head-cat'], equipped: { head: 'head-cat' } };
    expect(equippedOrDefault(p, 'head')).toBe('head-cat');
  });

  it('returns null when the slot is empty', () => {
    expect(equippedOrDefault(newProgress(), 'head')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/engine/progress`.

- [ ] **Step 3: Write `src/engine/progress.ts`**

`completeLevel` is pure — it returns a new object and the list of newly earned parts, so the UI knows what to celebrate.

```ts
import { nextUnearnedPart, type Slot } from './parts';
import { LEVELS, levelById, par } from './robot/levels';

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

export const newProgress = (): ProgressState => ({
  version: 1,
  completedLevels: [],
  tidyLevels: [],
  parts: [],
  equipped: {},
});

/** A level is playable once the previous one is complete. The first is always open. */
export const isLevelUnlocked = (progress: ProgressState, levelId: string): boolean => {
  const index = LEVELS.findIndex((l) => l.id === levelId);
  if (index <= 0) return index === 0;
  return progress.completedLevels.includes(LEVELS[index - 1].id);
};

/**
 * Records a solved level and awards parts: one for finishing, plus one more
 * for using no more tiles than par. Replaying an already-completed level
 * awards nothing unless it earns the tidy bonus for the first time.
 */
export const completeLevel = (
  progress: ProgressState,
  levelId: string,
  tilesUsed: number,
): { progress: ProgressState; earned: string[] } => {
  const level = levelById(levelId);
  const firstCompletion = !progress.completedLevels.includes(levelId);
  const tidy = tilesUsed <= par(level);
  const firstTidy = tidy && !progress.tidyLevels.includes(levelId);

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
      completedLevels: firstCompletion
        ? [...progress.completedLevels, levelId]
        : progress.completedLevels,
      tidyLevels: firstTidy ? [...progress.tidyLevels, levelId] : progress.tidyLevels,
      parts: owned,
    },
    earned,
  };
};

/** The part shown in a garage slot: the explicit choice, else the first owned, else null. */
export const equippedOrDefault = (progress: ProgressState, slot: Slot): string | null =>
  progress.equipped[slot] ?? progress.parts.find((id) => id.startsWith(`${slot}-`)) ?? null;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

Note: `equippedOrDefault`'s fallback relies on every part id beginning with `<slot>-`, which the Task 7 catalogue satisfies. The "only uses known slots" test in `parts.test.ts` does not enforce the prefix, so add this guard to `tests/engine/parts.test.ts` inside the `parts catalogue` describe block:

```ts
  it('prefixes every part id with its slot', () => {
    for (const part of PARTS) expect(part.id.startsWith(`${part.slot}-`)).toBe(true);
  });
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/progress.ts tests/engine/progress.test.ts tests/engine/parts.test.ts
git commit -m "feat(engine): progress state, level unlocks and part awards"
```

---

### Task 9: Engine barrel

The barrel is the only surface `ui/` imports from. Keeping it explicit stops components reaching into engine internals.

**Files:**
- Create: `src/engine/index.ts`

- [ ] **Step 1: Write the barrel**

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

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/index.ts
git commit -m "feat(engine): barrel export"
```

---

### Task 10: Platform layer — storage and speech

**Files:**
- Create: `src/platform/storage.ts`, `src/platform/speech.ts`
- Test: `tests/engine/storage.test.ts`

- [ ] **Step 1: Write the failing test**

Storage lives in `platform/` but is tested alongside the engine, matching number-islands. Vitest runs in Node, so the test installs a minimal localStorage stub.

`tests/engine/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, saveProgress } from '../../src/platform/storage';
import { newProgress } from '../../src/engine';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  } as Storage;
});

describe('storage', () => {
  it('returns fresh progress when nothing is stored', () => {
    expect(loadProgress()).toEqual(newProgress());
  });

  it('round-trips saved progress', () => {
    const p = { ...newProgress(), completedLevels: ['w1-1'], parts: ['head-classic'] };
    saveProgress(p);
    expect(loadProgress()).toEqual(p);
  });

  it('recovers from corrupt JSON without throwing', () => {
    store.set('cog-workshop:progress', '{not json');
    const loaded = loadProgress();
    expect(loaded.completedLevels).toEqual([]);
    expect(loaded.storageWarning).toBe(true);
  });

  it('discards progress saved under a different version', () => {
    store.set('cog-workshop:progress', JSON.stringify({ version: 99, parts: ['x'] }));
    const loaded = loadProgress();
    expect(loaded.parts).toEqual([]);
    expect(loaded.storageWarning).toBe(true);
  });

  it('backfills fields missing from an older save', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1, completedLevels: ['w1-1'], parts: ['head-classic'],
    }));
    const loaded = loadProgress();
    expect(loaded.tidyLevels).toEqual([]);
    expect(loaded.equipped).toEqual({});
  });

  it('does not persist the transient storageWarning flag', () => {
    saveProgress({ ...newProgress(), storageWarning: true } as never);
    expect(JSON.parse(store.get('cog-workshop:progress')!)).not.toHaveProperty('storageWarning');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/platform/storage`.

- [ ] **Step 3: Write `src/platform/storage.ts`**

```ts
import { newProgress, type ProgressState } from '../engine';

const KEY = 'cog-workshop:progress';

export type LoadedProgress = ProgressState & { storageWarning?: boolean };

export const loadProgress = (): LoadedProgress => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newProgress();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return { ...newProgress(), storageWarning: true };
    // Backfill fields added after a save may already have been written to disk.
    return {
      ...newProgress(),
      ...parsed,
      tidyLevels: parsed.tidyLevels ?? [],
      equipped: parsed.equipped ?? {},
    };
  } catch {
    return { ...newProgress(), storageWarning: true };
  }
};

export const saveProgress = (progress: ProgressState): void => {
  try {
    const { storageWarning, ...clean } = progress as LoadedProgress;
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch { /* a full or blocked store must never break play */ }
};
```

- [ ] **Step 4: Write `src/platform/speech.ts`**

```ts
export const speak = (text: string): void => {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch { /* audio is an enhancement, never fatal */ }
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/platform tests/engine/storage.test.ts
git commit -m "feat(platform): versioned progress storage and speech wrapper"
```

---

### Task 11: GridWorld component

The grid renders to SVG with a `viewBox` sized in grid cells, so one unit is one cell and no pixel maths is needed anywhere else.

**Files:**
- Create: `src/ui/robot/GridWorld.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import type { Cell, Level } from '../../engine';

  let {
    level,
    robotAt,
    crashed = false,
    glyph = '🤖',
  }: {
    level: Level;
    robotAt: Cell;
    crashed?: boolean;
    glyph?: string;
  } = $props();

  const isWall = (x: number, y: number) => level.walls.some((w) => w.x === x && w.y === y);

  const cells = $derived(
    Array.from({ length: level.width * level.height }, (_, i) => ({
      x: i % level.width,
      y: Math.floor(i / level.width),
    })),
  );
</script>

<svg
  class="grid"
  viewBox="0 0 {level.width} {level.height}"
  role="img"
  aria-label="the robot's world"
>
  {#each cells as cell (`${cell.x},${cell.y}`)}
    <rect
      x={cell.x + 0.03} y={cell.y + 0.03} width="0.94" height="0.94" rx="0.1"
      class="cell" class:wall={isWall(cell.x, cell.y)}
    />
  {/each}

  <text
    x={level.goal.x + 0.5} y={level.goal.y + 0.5}
    class="goal" text-anchor="middle" dominant-baseline="central"
  >⭐</text>

  <!--
    Position via a CSS transform on a <g>, not x/y attributes on the <text>.
    CSS transitions on SVG x/y geometry attributes are unreliable in iOS
    Safari, which is a primary target. transform is animatable everywhere.
    The shake lives on an inner <g> so it cannot fight the position transform.
  -->
  <g class="robot" style="transform: translate({robotAt.x + 0.5}px, {robotAt.y + 0.5}px)">
    <g class:crashed>
      <text class="glyph" text-anchor="middle" dominant-baseline="central">{glyph}</text>
    </g>
  </g>
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

  .cell.wall {
    fill: var(--border);
    stroke: none;
  }

  .goal { font-size: 0.6px; }

  .glyph { font-size: 0.7px; }

  .robot {
    /* The robot slides between cells; the trace drives one cell per tick. */
    transition: transform 0.28s ease;
  }

  .crashed {
    animation: shake 0.3s ease;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-0.08px); }
    75% { transform: translateX(0.08px); }
  }
</style>
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/robot/GridWorld.svelte
git commit -m "feat(ui): SVG grid world with cell-unit viewBox"
```

---

### Task 12: ProgramStrip and ArrowPad components

**Files:**
- Create: `src/ui/robot/ProgramStrip.svelte`, `src/ui/robot/ArrowPad.svelte`

- [ ] **Step 1: Write `src/ui/robot/ProgramStrip.svelte`**

Shows the program as tiles. Tapping a tile removes it — the simplest edit a 5-year-old can perform reliably. The currently-executing tile is highlighted, and the crashed tile pulses.

```svelte
<script lang="ts">
  import type { Direction, Instruction } from '../../engine';

  let {
    program,
    slots,
    activePath = null,
    crashPath = null,
    onremove,
  }: {
    program: Instruction[];
    slots: number;
    activePath?: number[] | null;
    crashPath?: number[] | null;
    onremove: (index: number) => void;
  } = $props();

  const GLYPH: Record<Direction, string> = {
    up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️',
  };

  const label = (tile: Instruction): string => {
    if (tile.kind === 'move') return GLYPH[tile.dir];
    if (tile.kind === 'repeat') return `${tile.body.map((m) => GLYPH[m.dir]).join('')}×${tile.times}`;
    return '🧩';
  };

  const empties = $derived(Math.max(0, slots - program.length));
</script>

<div class="strip" role="group">
  {#each program as tile, i (i)}
    <button
      type="button"
      class="tile"
      class:active={activePath?.[0] === i}
      class:crashed={crashPath?.[0] === i}
      class:wide={tile.kind === 'repeat'}
      onclick={() => onremove(i)}
      aria-label="remove step {i + 1}"
    >
      {label(tile)}
    </button>
  {/each}

  {#each Array(empties) as _, i (i)}
    <div class="tile empty" aria-hidden="true"></div>
  {/each}
</div>

<style>
  .strip {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-start;
    width: 100%;
    min-height: 4rem;
    padding: 0.5rem;
  }

  .tile {
    min-width: 3rem;
    min-height: 3rem;
    border-radius: 14px;
    background: var(--card-bg);
    border: 2px solid var(--border);
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tile.wide {
    min-width: 4.6rem;
    font-size: 1rem;
  }

  .tile.empty {
    background: transparent;
    border-style: dashed;
    opacity: 0.4;
  }

  .tile.active {
    border-color: var(--accent);
    background: var(--accent-bg);
    transform: scale(1.08);
  }

  .tile.crashed {
    border-color: var(--crash);
    animation: pulse 0.6s ease infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.12); }
  }
</style>
```

- [ ] **Step 2: Write `src/ui/robot/ArrowPad.svelte`**

Only the arrows the level offers are shown, so world 1 presents exactly one button — the decision really is only "how many".

The repeat button is disabled only by `running`, not by `full`: wrapping the last move already in the strip into a repeat (or bumping an existing repeat's count) replaces a tile in place rather than adding one, so it never needs a free slot the way the arrow keys and the mini button do — a full program should still let the player loop its last move.

```svelte
<script lang="ts">
  import type { Direction } from '../../engine';

  let {
    arrows,
    repeatAllowed = false,
    miniSlots = 0,
    full = false,
    running = false,
    onarrow,
    onrepeat,
    onmini,
    onplay,
    onclear,
  }: {
    arrows: Direction[];
    repeatAllowed?: boolean;
    miniSlots?: number;
    full?: boolean;
    running?: boolean;
    onarrow: (dir: Direction) => void;
    onrepeat: () => void;
    onmini: () => void;
    onplay: () => void;
    onclear: () => void;
  } = $props();

  const GLYPH: Record<Direction, string> = {
    up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️',
  };
  const ORDER: Direction[] = ['up', 'left', 'right', 'down'];
  const shown = $derived(ORDER.filter((d) => arrows.includes(d)));
</script>

<div class="pad">
  <div class="arrows">
    {#each shown as dir (dir)}
      <button
        type="button" class="key" disabled={full || running}
        onclick={() => onarrow(dir)} aria-label="add {dir}"
      >{GLYPH[dir]}</button>
    {/each}

    {#if repeatAllowed}
      <button
        type="button" class="key special" disabled={running}
        onclick={onrepeat} aria-label="add a repeat"
      >🔁</button>
    {/if}

    {#if miniSlots > 0}
      <button
        type="button" class="key special" disabled={full || running}
        onclick={onmini} aria-label="add the mini program"
      >🧩</button>
    {/if}
  </div>

  <div class="actions">
    <button
      type="button" class="clear" disabled={running}
      onclick={onclear} aria-label="clear the program"
    >🗑️</button>
    <button
      type="button" class="play" disabled={running}
      onclick={onplay} aria-label="run the program"
    >▶</button>
  </div>
</div>

<style>
  .pad {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
    width: 100%;
  }

  .arrows {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .key {
    min-width: 4.2rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--card-bg);
    box-shadow: var(--shadow);
    font-size: 2rem;
  }

  .key.special { background: var(--accent-bg); }

  .key:active:not(:disabled) { transform: scale(0.93); }
  .key:disabled { opacity: 0.35; }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .play {
    min-width: 5.5rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--accent);
    color: #1b1b23;
    font-size: 2rem;
    box-shadow: var(--shadow);
  }

  .clear {
    min-width: 4.2rem;
    min-height: 4.2rem;
    border-radius: 20px;
    background: var(--card-bg);
    font-size: 1.6rem;
  }

  .play:active:not(:disabled), .clear:active:not(:disabled) { transform: scale(0.93); }
  .play:disabled, .clear:disabled { opacity: 0.35; }
</style>
```

- [ ] **Step 3: Verify it type-checks**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/robot/ProgramStrip.svelte src/ui/robot/ArrowPad.svelte
git commit -m "feat(ui): program strip and arrow pad"
```

---

### Task 13: RobotLevel — the play screen

This is the heart of the game. It builds a program, hands it to the engine, and animates the returned trace one step at a time.

**Files:**
- Create: `src/ui/robot/RobotLevel.svelte`

- [ ] **Step 1: Write the component**

Note the repeat-tile interaction: tapping 🔁 wraps the **last one or two move tiles already in the strip** into a repeat (two only when both trailing tiles are plain, not-yet-repeated moves — this is what makes a 2-move "zigzag" body like `w3-4`'s buildable), and tapping 🔁 again on the same repeat increases its count. That avoids a modal dial, which would be fiddly at 5.

```svelte
<script lang="ts">
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
  // svelte-ignore state_referenced_locally — initial capture only; the
  // $effect below reassigns robotAt via reset() on every level change.
  let robotAt: Cell = $state({ ...level.start });
  let activePath: number[] | null = $state(null);
  let crashPath: number[] | null = $state(null);
  let running = $state(false);
  let solved = $state(false);

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

    const trace = run(level, program, mini);

    for (const step of trace.steps) {
      activePath = step.path;
      if (step.outcome === 'moved') robotAt = step.to;
      await wait(STEP_MS);
    }

    activePath = null;
    running = false;

    if (trace.status === 'goal') {
      solved = true;
      speak('You did it!');
      await wait(900);
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/robot/RobotLevel.svelte
git commit -m "feat(ui): robot play screen with trace animation and crash highlighting"
```

---

### Task 14: RobotBench — level select

**Files:**
- Create: `src/ui/robot/RobotBench.svelte`

- [ ] **Step 1: Write the component**

Levels are numbered within their world and grouped by it, so Oskar sees four short rows rather than one long list. Locked levels show a padlock and are not tappable.

```svelte
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/robot/RobotBench.svelte
git commit -m "feat(ui): robot level select with lock and completion state"
```

---

### Task 15: Home and Garage

**Files:**
- Create: `src/ui/Home.svelte`, `src/ui/Garage.svelte`

- [ ] **Step 1: Write `src/ui/Home.svelte`**

Three benches. Only the robot exists in v1, so the other two show a padlock — visible so Oskar knows more is coming, disabled so he cannot hit a dead end.

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

<section class="home">
  <h1>Cog Workshop</h1>

  <div class="benches">
    <button type="button" class="bench" onclick={onrobot} aria-label="teach the robot">
      <span class="glyph">🤖</span>
    </button>

    <button type="button" class="bench locked" disabled aria-label="lightbulb machine, locked">
      <span class="glyph">💡</span>
      <span class="lock" aria-hidden="true">🔒</span>
    </button>

    <button type="button" class="bench locked" disabled aria-label="marble machine, locked">
      <span class="glyph">⚙️</span>
      <span class="lock" aria-hidden="true">🔒</span>
    </button>
  </div>

  <button type="button" class="garage" onclick={ongarage} aria-label="my robots">
    <span class="glyph">🔧</span>
    <span class="count">{partCount}</span>
  </button>
</section>

<style>
  .home {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    min-height: 100svh;
    padding: 1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.6rem;
    color: var(--accent);
  }

  .benches {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 320px;
  }

  .bench {
    position: relative;
    width: 100%;
    min-height: 7rem;
    border-radius: 26px;
    background: var(--card-bg);
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bench .glyph { font-size: 3.4rem; }
  .bench:active:not(:disabled) { transform: scale(0.96); }
  .bench.locked { opacity: 0.45; }

  .lock {
    position: absolute;
    right: 1rem;
    font-size: 1.6rem;
  }

  .garage {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 4rem;
    padding: 0 1.5rem;
    border-radius: 20px;
    background: var(--accent-bg);
    border: 2px solid var(--accent);
  }

  .garage .glyph { font-size: 1.8rem; }
  .garage .count { font-size: 1.4rem; font-weight: 700; color: var(--accent); }
</style>
```

- [ ] **Step 2: Write `src/ui/Garage.svelte`**

Earned parts only. Tapping a part equips it in its slot and speaks its name, so the assembled robot changes in front of him.

```svelte
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
```

- [ ] **Step 3: Verify it type-checks**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/Home.svelte src/ui/Garage.svelte
git commit -m "feat(ui): home screen and robot parts garage"
```

---

### Task 16: App routing, persistence and the award pop-up

**Files:**
- Modify: `src/ui/App.svelte` (replaces the Task 1 placeholder entirely)

- [ ] **Step 1: Write the component**

Progress is saved on every change. The award pop-up is the only celebration — it appears after a solve, names the part aloud, and dismisses on tap.

```svelte
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
```

- [ ] **Step 2: Verify everything type-checks and tests still pass**

Run: `npm run check`
Expected: no errors.

Run: `npm test`
Expected: PASS — all engine tests green.

- [ ] **Step 3: Play it locally**

Run: `npm run dev`

Open the printed URL and check, using the browser's device toolbar set to iPhone 13 mini (375×812):
- Home shows three benches; the robot one opens, the other two are locked.
- World 1 level 1 shows exactly **one** arrow button.
- Adding two ➡️ tiles and pressing ▶ walks the robot to the star and pops an award.
- Adding one ➡️ and pressing ▶ leaves the robot short and speaks a prompt, with no penalty.
- Pressing ⬅️ from a level returns to the bench with level 2 now unlocked.

- [ ] **Step 4: Commit**

```bash
git add src/ui/App.svelte
git commit -m "feat(ui): screen routing, progress persistence and part award pop-up"
```

---

### Task 17: Ship it

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README status**

Replace the `## Status` section of `README.md` with:

```markdown
## Status

🤖 **v1 live** — the shared shell and Teach the Robot (15 levels, four worlds).
Lightbulb Machine and Marble Machine are next, each with its own plan.

**Play:** https://maxvdp-irl.github.io/cog-workshop/
```

- [ ] **Step 2: Push and verify the deploy**

```bash
git add README.md
git commit -m "docs: mark v1 shell and robot game as shipped"
git push origin main
```

Run: `gh run watch`
Expected: `build` and `deploy` both succeed.

- [ ] **Step 3: Test on the real devices**

Open `https://maxvdp-irl.github.io/cog-workshop/` on the iPhone 13 mini and the Galaxy S20. This is the test the unit suite cannot do.

Check:
- [ ] Every button is comfortably hittable with a 5-year-old's finger; nothing needs precision.
- [ ] Nothing requires reading beyond the arrow, play and back icons.
- [ ] The robot's movement is easy to follow — if it looks too fast to track, raise `STEP_MS` in `RobotLevel.svelte`.
- [ ] Double-tapping a button does not zoom the page.
- [ ] Add to home screen works, opens without browser chrome, and stays in portrait.
- [ ] Closing the app entirely and reopening it preserves earned parts and unlocked levels.
- [ ] Spoken audio plays (note: iOS Safari only permits speech after the first user tap — confirm it works from the second interaction onward, and do not chase it if the very first utterance is silent).

- [ ] **Step 4: Watch Oskar play world 1, and change nothing while he does**

The point of this step is to find out whether the core idea lands before any more is built on top of it. Note specifically:
- Does he work out that the tiles run in order, without being told?
- On a crash, does he look at the pulsing tile?
- Is world 2's four-arrow pad a step up, or a wall?

Record what you observe in the repo — those notes are the input to the Lightbulb Machine plan and to any world 2–4 tuning.

---

## Plan Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Home screen, three picture tiles | 15 |
| Two later games visibly locked | 15 |
| Robot parts reward loop | 7, 8, 16 |
| Garage assembly | 15 |
| Tidy-solution bonus part | 8, 13 |
| No buzzers/lives/timers, unlimited retries | 13 (no failure state), 17 |
| Grid world + program strip + arrow pad layout | 11, 12, 13 |
| Executing tile highlighted | 12, 13 |
| Crash halts and marks the offending tile | 3, 12, 13 |
| World 1 — single arrow direction | 6 (data + test), 12 |
| World 2 — four arrows, obstacles | 6 |
| World 3 — repeat tiles, limited slots | 4, 6, 13 |
| World 4 — mini-programs | 5, 6, 13 |
| No turn instruction; facing is decoration | 3 (types), 6 (test), 11 |
| Levels are cheap grid data | 6 |
| Engine pure TS, no DOM | 3–9 |
| Svelte 5 UI over a narrow barrel | 9, 11–16 |
| localStorage, no accounts, no backend | 10, 16 |
| PWA, portrait, offline | 1, 17 |
| GitHub Actions → Pages | 2 |
| Empty program is graceful | 3 (test), 13 |
| Unsolvable levels cannot ship | 6 |
| Backgrounding never corrupts progress | 13 (run state is local, progress saves only on solve) |
| Engine unit tests, manual device testing | 3–10, 17 |

Out of scope for this plan, per the spec's build order: the Lightbulb Machine and the Marble Machine. Each gets its own plan against the same spec.

**Placeholder scan:** no TBDs, no "add error handling", no "similar to Task N". Every code step carries its full code.

**Type consistency:** `run(level, program, mini)` is defined in Task 3 and extended in Tasks 4–5 with the same name and argument order used in Tasks 6 and 13. `ProgressState` fields (`completedLevels`, `tidyLevels`, `parts`, `equipped`) are consistent across Tasks 8, 10, 14, 15 and 16. `completeLevel` returns `{ progress, earned }` in Task 8 and is destructured that way in Task 16. `par(level)` is defined in Task 6 and used in Tasks 8 and 13. `equippedOrDefault(progress, slot)` is defined in Task 8 and used in Tasks 15 and 16. `Slot` and `SLOTS` come from Task 7 and are re-exported in Task 9.
