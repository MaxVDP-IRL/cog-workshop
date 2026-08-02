# Design: Cog Workshop

**Date:** 2026-08-02
**Status:** Approved

## Purpose

A browser-based app for Oskar (just turned 5) that teaches how machines and
computers work, by building things that then run: programs, counting machines,
and marble contraptions.

This is a sibling to Number Islands, not part of it. Number Islands teaches
Year 1 number sense; Cog Workshop teaches computing — sequencing, debugging,
place value, and cause-and-effect.

Working name: **Cog Workshop**. Alternatives under consideration: Tinker Shed,
Robot Workshop, Cog Valley. Oskar picks the final name; nothing in the design
depends on it.

## Target device & input

- Primary devices: iPhone 13 mini, Galaxy S20 (phone-sized screens, portrait)
- Input: finger touch, no stylus
- Reading level: a few simple words only ("go", "stop", "next"). Everything
  else must be conveyed by icons, animation, and spoken audio.
- Portrait orientation locked.

## Scope (v1)

Three games ("benches") in one app, sharing a single shell.

1. **Teach the Robot** — sequencing, debugging, repeats, mini-programs
2. **Lightbulb Machine** — binary and place value
3. **Marble Machine** — routing, halving, cause-and-effect

Build order is Robot → Lightbulbs → Marbles. Each is shippable on its own, so
Oskar is playing the robot game before the other two exist.

**The first implementation plan covers the shared shell plus Teach the Robot
only.** The Lightbulb Machine and Marble Machine each get their own plan
afterwards, written against this same spec.

## Shared shell

**Home screen:** three large picture tiles — a robot, a row of lightbulbs, a
marble run. Tap to enter a bench. No text navigation, no menus.

**Reward loop — robot parts, not stars.** Completing a level earns a part (a
wheel, an aerial, a googly eye). Parts collect in a **garage** where Oskar
assembles his own robots from what he has earned. This rewards the thing he
already enjoys — putting things together — rather than adding an unrelated
sticker book.

An optional extra part is awarded for solving a level in the fewest tiles. This
teaches efficiency as a real idea, but is never required to progress.

**Tone (borrowed deliberately from Number Islands):** no buzzers, no lives, no
timers. A wrong answer is information, not a failure. Every level is retryable
indefinitely with no penalty.

The shell also owns: the progress store, spoken audio, and the portrait phone
layout. Sharing it is what makes three games substantially cheaper than three
apps.

## Game 1: Teach the Robot

### Layout

- **Top half:** a small grid world (roughly 4x4 to 6x6) with the robot at one
  end and a star to reach, plus walls/obstacles.
- **Bottom half:** an empty **program strip** and a row of large arrow buttons.
  The number of slots in the strip is set per level, and is part of the level
  definition.

### Interaction

Tap an arrow button to append a tile to the program strip. Tap a tile in the
strip to change or remove it. Tap ▶ to run.

The robot executes the program one step at a time, and **the tile currently
executing is highlighted**, making the link between instruction and movement
visible.

On a crash (into a wall or off the grid) the robot stops and the offending tile
pulses. Oskar taps that tile, changes it, and runs again. This is debugging,
learned without the word being used.

### Progression

1. **Straight lines** — a single arrow direction is available, so the only
   decision is how many steps. Establishes that a program is a list run in
   order. Counting the steps is the maths content.
2. **Corners** — all four arrow directions available, with obstacles to route
   around.
3. **Repeat** — a repeat tile with a number dial wrapping a short sequence
   ("these 2 steps, 3 times"). Multiplication made observable. The program
   strip has limited slots, so repeats become necessary rather than optional.
4. **Mini-program** — define a short named sequence as a coloured tile and use
   it more than once. This is a function.

### Pedagogy decision: absolute arrows before relative turns

Worlds 1 and 2 use **absolute direction arrows** — tapping ↑ moves the robot up
the screen.

Relative turning ("turn the robot's own left") requires taking the robot's
point of view rather than the child's, which is the genuinely difficult step at
age 5. It is therefore deferred to its own later world, introduced only once
sequencing is solid, and supported by a preview animation: tapping a turn tile
makes the robot wiggle in the direction it would turn.

### Content

Levels are small grid definitions, so authoring is cheap and carries none of
the hand-authored-path risk that Mia's cursive app has.

## Game 2: Lightbulb Machine

A row of five switches worth 1, 2, 4, 8, and 16. Each switch is drawn with that
many dots, so its value is visible rather than memorised.

The machine displays a target as both a pile of objects and a numeral. Oskar
flips switches; a running total fills alongside. Matching the target makes the
machine light up and run.

**Progression:** begin with two switches (targets 1–3), introducing one further
switch at a time up to 31.

**Count-up mode:** a single +1 button. Pressing it repeatedly ticks the bulbs
through the counting sequence — on, off-and-carry, on — revealing the pattern
by which the machine counts. This is binary and place value discovered by hand,
before the vocabulary is introduced.

This is the cheapest of the three games to build: a handful of booleans and a
sum.

## Game 3: Marble Machine

### Scope decision: discrete grid, not physics

The obvious implementation needs a physics engine plus drag-and-drop, on a 5.4"
screen, operated by a 5-year-old's fingers. That is the most expensive
component in the app and the worst fit for the device.

v1 therefore uses **a discrete grid with tap-to-place**. A palette at the bottom
holds ramp-left, ramp-right, splitter, and bucket. Tap a palette piece, then tap
a grid cell to place it. Marbles advance cell by cell on a fixed tick —
deterministic, with no gravity simulation and no collision handling.

### Play

Goal: route marbles into the correct buckets. Splitters take one marble in and
emit one on each side, so halving and doubling are observed directly. Levels
teach routing and cause-and-effect.

The loop — build it, run it, watch it, fix it — is the same as the robot game,
which is the through-line of the whole app.

A deterministic grid is pure logic, making the entire simulation unit-testable
with no browser involved. Real marble physics is a v2 question, to be decided
with evidence from actual use.

## Architecture

Mirrors Number Islands deliberately, so the project is a familiar sibling with
no new stack to learn.

- **Stack:** Svelte 5 + Vite + TypeScript + Vitest
- **`engine/` — pure TypeScript, no DOM:** level definitions, the robot
  simulator (program + grid → a step-by-step execution trace), the binary
  machine, the marble grid tick, and the progress store. All game rules live
  here.
- **`ui/` — Svelte components** consuming the engine through a narrow
  interface.
- **`platform/`** — localStorage access.
- **Delivery:** installable PWA (add-to-home-screen), works offline, portrait
  locked, targets mobile Safari and Chrome.
- **Data storage:** fully client-side. No profiles, no accounts, no backend.
  Progress stays on the device and nothing leaves it.
- **Hosting:** new public repo under `MaxVDP-IRL`, deployed via GitHub Actions
  to GitHub Pages on every push to `main`. Stable URL to add to the home
  screen; no server to run or pay for.

## Data flow

Build (tap tiles / flip switches / place pieces) → engine produces a
deterministic result (execution trace, total, or marble routing) → UI animates
that result step by step → on success the progress store records the level and
awards a part → garage reflects the new part.

## Edge cases

- **Empty program / no pieces placed:** running does nothing gracefully rather
  than erroring.
- **Unsolvable level:** prevented from shipping by an automated solvability
  check over all level content.
- **App backgrounded mid-run:** the in-progress run is discarded; recorded
  progress is never affected.
- **Retries:** unlimited, with no penalty and no lost progress.
- **Crash during execution:** halts the run at the offending tile rather than
  ending the level.

## Testing approach

The engine holds the logic, so that is where the tests are:

- Robot: a given program and grid produce an exact expected execution trace,
  including crash position.
- Lightbulb Machine: switch combinations produce exact totals.
- Marble Machine: a given board produces exact per-bucket marble counts.
- Content validity: every shipped level is solvable within its slot limit.

Manual on-device testing with Oskar covers what tests cannot: tap target size,
pacing, and whether the concept actually lands.

## Out of scope for v1

- Multiple profiles
- Parent/progress screen
- Cloud sync or multi-device progress
- Real marble physics
- Any in-app level editor
- Audio beyond spoken prompts and simple effects
