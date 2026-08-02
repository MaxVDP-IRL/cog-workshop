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
