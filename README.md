# Cog Workshop ⚙️

A browser-based app for Oskar (5) that teaches how machines and computers work,
by building things that then run. Three benches in one app: program a robot,
count in binary, route marbles. Fully playable without reading, designed for
small phone touchscreens, offline-capable PWA with no backend.

Sibling to [Number Islands](https://github.com/MaxVDP-IRL/number-islands) —
that one teaches number sense, this one teaches computing.

## Status

🤖 **v1 live** — the shared shell and Teach the Robot (15 levels, four worlds).
Lightbulb Machine and Marble Machine are next, each with its own plan.

**Play:** https://maxvdp-irl.github.io/cog-workshop/

## Start here (for the coding session)

1. [docs/superpowers/specs/2026-08-02-cog-workshop-design.md](docs/superpowers/specs/2026-08-02-cog-workshop-design.md) — the approved design spec (the contract).

## Design in one paragraph

Three games share one shell: a home screen of picture tiles, a progress store,
spoken audio, and a reward loop that pays out **robot parts** Oskar assembles
into his own robots in a garage. **Teach the Robot** has him build a program
from arrow tiles and watch it execute step by step, with the running tile
highlighted and crashes pointing at the tile that caused them — sequencing and
debugging, progressing to repeats (multiplication he can watch) and
mini-programs (functions). **Lightbulb Machine** uses switches worth 1, 2, 4, 8,
16 to hit a target, plus a +1 button that ticks the bulbs through the counting
pattern — binary and place value discovered by hand. **Marble Machine** is
tap-to-place pieces on a deterministic grid — routing and halving, with no
physics engine. No buzzers, no lives, no timers. Build order: Robot →
Lightbulbs → Marbles, each shippable on its own.

## Tech

TypeScript + Vite + Svelte 5 + Vitest. Pure-TS `engine/` (all game rules,
unit-tested, no DOM) behind a narrow interface consumed by Svelte `ui/`. State
in localStorage. Static deploy to GitHub Pages.
