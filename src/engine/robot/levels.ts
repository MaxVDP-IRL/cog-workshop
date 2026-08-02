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
      ...Array.from({ length: 3 }, () => ({ kind: 'move' as const, dir: 'right' as const })),
      ...Array.from({ length: 3 }, () => ({ kind: 'move' as const, dir: 'up' as const })),
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
    // Cross column x=2 at y=2 (walls only block y=3 and y=4 there), then
    // come back down to the goal row on the far side.
    solution: [
      { kind: 'move', dir: 'up' },
      { kind: 'move', dir: 'up' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'down' },
      { kind: 'move', dir: 'down' },
    ],
  },
  {
    id: 'w2-4', world: 2, width: 5, height: 5,
    start: { x: 0, y: 0 }, goal: { x: 4, y: 4 },
    // Two wall clusters, one guarding each naive corner path: {4,1}/{4,2}
    // block "all the way right, then all the way down" and {1,4}/{2,4}
    // block "all the way down, then all the way right". Only a route that
    // turns mid-grid (e.g. via column x=3) gets through.
    walls: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 1, y: 4 }, { x: 2, y: 4 }],
    slots: 10, arrows: ['up', 'down', 'left', 'right'], repeatAllowed: false, miniSlots: 0,
    solution: [
      ...Array.from({ length: 3 }, () => ({ kind: 'move' as const, dir: 'right' as const })),
      ...Array.from({ length: 4 }, () => ({ kind: 'move' as const, dir: 'down' as const })),
      { kind: 'move' as const, dir: 'right' as const },
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
    start: { x: 0, y: 4 }, goal: { x: 4, y: 0 },
    // {2,2} sits on the diagonal midpoint of every balanced right/up
    // interleaving (any body that alternates right and up hits it), so the
    // single-tile zigzag from w3-4 cannot solve this level. The two-block
    // route (all rights along row y=4, then all ups along column x=4) never
    // passes through {2,2} and still fits in two repeat tiles.
    walls: [{ x: 2, y: 2 }],
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
