import { describe, it, expect } from 'vitest';
import { LEVELS, levelById, firstLevelId, nextLevelId, par } from '../../src/engine/lightbulb/levels';
import { SWITCH_VALUES } from '../../src/engine/lightbulb/types';
import { litCount } from '../../src/engine/lightbulb/machine';

describe('lightbulb level content', () => {
  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders levels by stage, never going backwards', () => {
    const stages = LEVELS.map((l) => l.stage);
    expect([...stages].sort((a, b) => a - b)).toEqual(stages);
  });

  it('starts at stage 1', () => {
    expect(levelById(firstLevelId()).stage).toBe(1);
  });

  it('offers exactly stage+1 switches at each stage', () => {
    for (const level of LEVELS) {
      expect(level.switches.length, `${level.id}`).toBe(level.stage + 1);
    }
  });

  it('keeps every switch list in ascending value order', () => {
    for (const level of LEVELS) {
      expect(level.switches).toEqual([...level.switches].sort((a, b) => a - b));
    }
  });

  it('only requires switches the level actually offers', () => {
    for (const level of LEVELS) {
      for (const sw of SWITCH_VALUES) {
        const bitNeeded = (level.target & sw) !== 0;
        if (bitNeeded) {
          expect(level.switches, `${level.id} needs switch ${sw} for target ${level.target}`).toContain(sw);
        }
      }
    }
  });

  it('derives par from the target lit count', () => {
    for (const level of LEVELS) {
      expect(par(level)).toBe(litCount(level.target));
    }
  });

  it('never targets zero', () => {
    for (const level of LEVELS) expect(level.target).toBeGreaterThan(0);
  });

  it('chains levels in order and ends with null', () => {
    let id: string | null = firstLevelId();
    let count = 0;
    while (id) { count++; id = nextLevelId(id); }
    expect(count).toBe(LEVELS.length);
  });

  it('throws on an unknown id', () => {
    expect(() => levelById('nope')).toThrow();
  });
});
