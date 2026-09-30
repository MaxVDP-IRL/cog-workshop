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
  {
    // The dashed cup sits up high, with empty rows underneath. The bucket
    // stops the marble there — it does not have to ride all the way down.
    id: 'm1-6', world: 1, width: 5, height: 6,
    spawn: { x: 3, y: 0 }, targets: [{ x: 0, y: 3 }],
    slots: 5, palette: ['ramp-left', 'ramp-right'],
    solution: [
      { cell: { x: 3, y: 0 }, kind: 'ramp-left' },
      { cell: { x: 2, y: 1 }, kind: 'ramp-left' },
      { cell: { x: 1, y: 2 }, kind: 'ramp-left' },
      { cell: { x: 0, y: 3 }, kind: 'bucket' },
    ],
  },
  {
    // A long diagonal on a bigger square. One ramp each row, all the way
    // from the top-left corner to the bottom-right cup.
    id: 'm1-7', world: 1, width: 6, height: 6,
    spawn: { x: 0, y: 0 }, targets: [{ x: 5, y: 5 }],
    slots: 7, palette: ['ramp-left', 'ramp-right'],
    solution: [
      { cell: { x: 0, y: 0 }, kind: 'ramp-right' },
      { cell: { x: 1, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 2, y: 2 }, kind: 'ramp-right' },
      { cell: { x: 3, y: 3 }, kind: 'ramp-right' },
      { cell: { x: 4, y: 4 }, kind: 'ramp-right' },
      { cell: { x: 5, y: 5 }, kind: 'bucket' },
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
    // Move first, then split: splitting straight from spawn lands one column
    // too far left on both sides.
    id: 'm2-3', world: 2, width: 5, height: 5,
    spawn: { x: 1, y: 0 }, targets: [{ x: 1, y: 4 }, { x: 3, y: 4 }],
    slots: 6, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 1, y: 0 }, kind: 'ramp-right' },
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
  {
    // Wider board. After the split, the right-hand marble needs two ramps
    // to reach the far cup; the left-hand one needs a single ramp.
    id: 'm2-5', world: 2, width: 7, height: 5,
    spawn: { x: 3, y: 0 }, targets: [{ x: 1, y: 4 }, { x: 6, y: 4 }],
    slots: 7, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 3, y: 0 }, kind: 'splitter' },
      { cell: { x: 2, y: 1 }, kind: 'ramp-left' },
      { cell: { x: 4, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 5, y: 2 }, kind: 'ramp-right' },
      { cell: { x: 1, y: 4 }, kind: 'bucket' },
      { cell: { x: 6, y: 4 }, kind: 'bucket' },
    ],
  },
  {
    // One cup is up high, one is on the floor. The high bucket catches its
    // marble early; the other marble keeps falling.
    id: 'm2-6', world: 2, width: 5, height: 6,
    spawn: { x: 2, y: 0 }, targets: [{ x: 0, y: 3 }, { x: 4, y: 5 }],
    slots: 6, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 2, y: 0 }, kind: 'splitter' },
      { cell: { x: 1, y: 1 }, kind: 'ramp-left' },
      { cell: { x: 3, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 0, y: 3 }, kind: 'bucket' },
      { cell: { x: 4, y: 5 }, kind: 'bucket' },
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
  {
    // Split, then split only the left branch. One of those marbles is
    // caught halfway down; the other two ride to the floor.
    id: 'm3-4', world: 3, width: 7, height: 6,
    spawn: { x: 3, y: 0 }, targets: [{ x: 1, y: 5 }, { x: 3, y: 2 }, { x: 5, y: 5 }],
    slots: 7, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 3, y: 0 }, kind: 'splitter' },
      { cell: { x: 2, y: 1 }, kind: 'splitter' },
      { cell: { x: 4, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 3, y: 2 }, kind: 'bucket' },
      { cell: { x: 1, y: 5 }, kind: 'bucket' },
      { cell: { x: 5, y: 5 }, kind: 'bucket' },
    ],
  },
  {
    // Both branches are nudged apart and then split, so one marble becomes
    // four and each lands in its own cup. Taller than m3-3 so the ramps
    // fit between the two rounds of splitting.
    id: 'm3-5', world: 3, width: 7, height: 6,
    spawn: { x: 3, y: 0 }, targets: [
      { x: 0, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 6, y: 5 },
    ],
    slots: 10, palette: ['ramp-left', 'ramp-right', 'splitter'],
    solution: [
      { cell: { x: 3, y: 0 }, kind: 'splitter' },
      { cell: { x: 2, y: 1 }, kind: 'ramp-left' },
      { cell: { x: 4, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 1, y: 2 }, kind: 'splitter' },
      { cell: { x: 5, y: 2 }, kind: 'splitter' },
      { cell: { x: 0, y: 5 }, kind: 'bucket' },
      { cell: { x: 2, y: 5 }, kind: 'bucket' },
      { cell: { x: 4, y: 5 }, kind: 'bucket' },
      { cell: { x: 6, y: 5 }, kind: 'bucket' },
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
