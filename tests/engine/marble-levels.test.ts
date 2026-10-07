import { describe, it, expect } from 'vitest';
import { LEVELS, levelById, firstLevelId, nextLevelId, par } from '../../src/engine/marble/levels';
import { run } from '../../src/engine/marble/simulator';

describe('marble level content', () => {
  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders levels by world, never going backwards', () => {
    const worlds = LEVELS.map((l) => l.world);
    expect([...worlds].sort((a, b) => a - b)).toEqual(worlds);
  });

  it('starts in world 1 with ramps only, no splitter', () => {
    const first = levelById(firstLevelId());
    expect(first.world).toBe(1);
    expect(first.palette).not.toContain('splitter');
  });

  it('never offers a splitter before world 2', () => {
    for (const level of LEVELS.filter((l) => l.world === 1)) {
      expect(level.palette).not.toContain('splitter');
    }
  });

  it('is solvable: every target actually catches a marble when the pinned solution runs', () => {
    for (const level of LEVELS) {
      const trace = run(level, level.solution);
      for (const target of level.targets) {
        const count = trace.caught[`${target.x},${target.y}`] ?? 0;
        expect(count, `${level.id} target (${target.x},${target.y}) caught nothing`).toBeGreaterThan(0);
      }
    }
  });

  it('every solution fits within its slot budget', () => {
    for (const level of LEVELS) {
      expect(level.solution.length, `${level.id} solution exceeds its slots`).toBeLessThanOrEqual(level.slots);
    }
  });

  it('only uses pieces the level actually offers', () => {
    for (const level of LEVELS) {
      for (const piece of level.solution) {
        if (piece.kind === 'bucket') continue;
        expect(level.palette, `${level.id} uses ${piece.kind}`).toContain(piece.kind);
      }
    }
  });

  it('every solution places a bucket on every target', () => {
    for (const level of LEVELS) {
      for (const target of level.targets) {
        const hasBucket = level.solution.some(
          (p) => p.kind === 'bucket' && p.cell.x === target.x && p.cell.y === target.y,
        );
        expect(hasBucket, `${level.id} has no bucket placed on target (${target.x},${target.y})`).toBe(true);
      }
    }
  });

  it('keeps spawn, targets, and every solution piece inside the grid', () => {
    for (const level of LEVELS) {
      const cells = [level.spawn, ...level.targets, ...level.solution.map((p) => p.cell)];
      for (const cell of cells) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(level.width);
        expect(cell.y).toBeLessThan(level.height);
      }
    }
  });

  it('derives par from the solution piece count', () => {
    expect(par(levelById(firstLevelId()))).toBe(levelById(firstLevelId()).solution.length);
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

  it('puts at most one solution piece on each cell and spawns on the top row', () => {
    for (const level of LEVELS) {
      const keys = level.solution.map((p) => `${p.cell.x},${p.cell.y}`);
      expect(new Set(keys).size, level.id).toBe(keys.length);
      expect(level.spawn.y, level.id).toBe(0);
    }
  });

  it('packs seven, six, and eleven levels across the three worlds', () => {
    const count = (world: number) => LEVELS.filter((l) => l.world === world).length;
    expect(count(1)).toBe(7);
    expect(count(2)).toBe(6);
    expect(count(3)).toBe(11);
    const highCup = levelById('m1-6');
    expect(highCup.targets.some((t) => t.y < highCup.height - 1)).toBe(true);
    const fourCups = levelById('m3-5');
    expect(fourCups.targets).toHaveLength(4);
    expect(fourCups.height).toBe(6);
    const finale = levelById('m3-11');
    expect(finale.targets).toHaveLength(5);
    expect(finale.targets.some((t) => t.y < finale.height - 1)).toBe(true);
  });

  it('keeps the original eighteen levels first so existing saves still unlock in order', () => {
    const original = [
      'm1-1', 'm1-2', 'm1-3', 'm1-4', 'm1-5', 'm1-6', 'm1-7',
      'm2-1', 'm2-2', 'm2-3', 'm2-4', 'm2-5', 'm2-6',
      'm3-1', 'm3-2', 'm3-3', 'm3-4', 'm3-5',
    ];
    expect(LEVELS.slice(0, original.length).map((l) => l.id)).toEqual(original);
    expect(nextLevelId('m3-5')).toBe('m3-6');
    expect(nextLevelId('m3-11')).toBeNull();
  });

  it('grows past four floor cups: later levels add height, folds, or a fifth cup', () => {
    const later = ['m3-6', 'm3-7', 'm3-8', 'm3-9', 'm3-10', 'm3-11'].map(levelById);
    for (const level of later) {
      expect(level.world).toBe(3);
      expect(level.width).toBeLessThanOrEqual(7);
      expect(level.height).toBeLessThanOrEqual(7);
      expect(level.slots).toBeGreaterThanOrEqual(level.solution.length);
      expect(level.slots).toBeLessThanOrEqual(12);
    }
    expect(levelById('m3-6').targets.some((t) => t.y < 6)).toBe(true);
    expect(levelById('m3-8').targets).toHaveLength(5);
    expect(levelById('m3-9').targets.filter((t) => t.y === 6).map((t) => t.x)).toEqual([1, 2, 6]);
    const stacked = levelById('m3-10');
    const column2 = stacked.targets.filter((t) => t.x === 2).map((t) => t.y).sort();
    expect(column2).toEqual([4, 6]);
  });
});
