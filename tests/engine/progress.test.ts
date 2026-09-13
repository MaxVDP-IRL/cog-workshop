import { describe, it, expect } from 'vitest';
import {
  newProgress, isLevelUnlocked, completeLevel, equippedOrDefault,
  isLightbulbLevelUnlocked, completeLightbulbLevel,
} from '../../src/engine/progress';
import { LEVELS, firstLevelId } from '../../src/engine/robot/levels';
import { LEVELS as LIGHTBULB_LEVELS, firstLevelId as firstLightbulbLevelId } from '../../src/engine/lightbulb/levels';
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

  it('keeps a level locked when an earlier-but-not-immediately-preceding level is complete', () => {
    const after = completeLevel(newProgress(), LEVELS[0].id, 2).progress;
    expect(isLevelUnlocked(after, LEVELS[2].id)).toBe(false);
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
