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
  { id: 'lb2-1', stage: 2, switches: [1, 2, 4], target: 4 },
  { id: 'lb2-2', stage: 2, switches: [1, 2, 4], target: 6 },
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
