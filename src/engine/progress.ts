import { nextUnearnedPart, type Slot } from './parts';
import { LEVELS, levelById, par } from './robot/levels';
import {
  LEVELS as LIGHTBULB_LEVELS, levelById as lightbulbLevelById, par as lightbulbPar,
} from './lightbulb/levels';

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

export const newProgress = (): ProgressState => ({
  version: 1,
  completedLevels: [],
  tidyLevels: [],
  lightbulbCompletedLevels: [],
  lightbulbTidyLevels: [],
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

/** The part shown in a garage slot: the explicit choice, else the first owned, else null. */
export const equippedOrDefault = (progress: ProgressState, slot: Slot): string | null =>
  progress.equipped[slot] ?? progress.parts.find((id) => id.startsWith(`${slot}-`)) ?? null;
