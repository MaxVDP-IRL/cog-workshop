import { newProgress, LEVELS, LIGHTBULB_LEVELS, PARTS, type ProgressState, type Slot } from '../engine';

const KEY = 'cog-workshop:progress';

export type LoadedProgress = ProgressState & { storageWarning?: boolean };

const validLevelIds = new Set(LEVELS.map((l) => l.id));
const validLightbulbLevelIds = new Set(LIGHTBULB_LEVELS.map((l) => l.id));
const validPartIds = new Set(PARTS.map((p) => p.id));

/** Keeps only ids present in the given valid-id set. */
const sanitizeIds = (ids: unknown, valid: Set<string>): string[] =>
  Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && valid.has(id)) : [];

/** Drops any slot whose equipped part id no longer exists in the current PARTS catalogue. */
const sanitizeEquipped = (equipped: unknown): Partial<Record<Slot, string>> => {
  if (!equipped || typeof equipped !== 'object' || Array.isArray(equipped)) return {};
  const result: Partial<Record<Slot, string>> = {};
  for (const [slot, partId] of Object.entries(equipped as Record<string, unknown>)) {
    if (typeof partId === 'string' && validPartIds.has(partId)) {
      result[slot as Slot] = partId;
    }
  }
  return result;
};

export const loadProgress = (): LoadedProgress => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newProgress();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return { ...newProgress(), storageWarning: true };
    // Backfill fields added after a save may already have been written to disk,
    // and sanitize ids against the current catalogues in case they've drifted.
    return {
      ...newProgress(),
      ...parsed,
      completedLevels: sanitizeIds(parsed.completedLevels, validLevelIds),
      tidyLevels: sanitizeIds(parsed.tidyLevels, validLevelIds),
      lightbulbCompletedLevels: sanitizeIds(parsed.lightbulbCompletedLevels, validLightbulbLevelIds),
      lightbulbTidyLevels: sanitizeIds(parsed.lightbulbTidyLevels, validLightbulbLevelIds),
      parts: sanitizeIds(parsed.parts, validPartIds),
      equipped: sanitizeEquipped(parsed.equipped),
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
