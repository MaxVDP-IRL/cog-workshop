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

  it('packs seven, six, and five levels across the three worlds', () => {
    const count = (world: number) => LEVELS.filter((l) => l.world === world).length;
    expect(count(1)).toBe(7);
    expect(count(2)).toBe(6);
    expect(count(3)).toBe(5);
    const highCup = levelById('m1-6');
    expect(highCup.targets.some((t) => t.y < highCup.height - 1)).toBe(true);
    const finale = levelById('m3-5');
    expect(finale.targets).toHaveLength(4);
    expect(finale.height).toBe(6);
  });
});
