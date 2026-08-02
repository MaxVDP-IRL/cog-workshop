import { describe, it, expect } from 'vitest';
import { LEVELS, levelById, firstLevelId, nextLevelId, par } from '../../src/engine/robot/levels';
import { run } from '../../src/engine/robot/simulator';

describe('level content', () => {
  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders levels by world, never going backwards', () => {
    const worlds = LEVELS.map((l) => l.world);
    expect([...worlds].sort((a, b) => a - b)).toEqual(worlds);
  });

  it('starts in world 1 with a single arrow direction', () => {
    const first = levelById(firstLevelId());
    expect(first.world).toBe(1);
    expect(first.arrows).toHaveLength(1);
  });

  it('offers exactly one arrow in every world 1 level', () => {
    for (const level of LEVELS.filter((l) => l.world === 1)) {
      expect(level.arrows).toHaveLength(1);
    }
  });

  it('never offers a repeat tile before world 3', () => {
    for (const level of LEVELS.filter((l) => l.world < 3)) {
      expect(level.repeatAllowed).toBe(false);
    }
  });

  it('never offers a mini-program before world 4', () => {
    for (const level of LEVELS.filter((l) => l.world < 4)) {
      expect(level.miniSlots).toBe(0);
    }
  });

  it('is solvable within its slot limit', () => {
    for (const level of LEVELS) {
      const trace = run(level, level.solution, level.solutionMini ?? []);
      expect(trace.status, `${level.id} should reach the goal`).toBe('goal');
      expect(level.solution.length, `${level.id} solution exceeds its slots`)
        .toBeLessThanOrEqual(level.slots);
    }
  });

  it('only uses arrows the level offers', () => {
    for (const level of LEVELS) {
      const dirs: string[] = [];
      for (const tile of level.solution) {
        if (tile.kind === 'move') dirs.push(tile.dir);
        if (tile.kind === 'repeat') dirs.push(...tile.body.map((m) => m.dir));
      }
      for (const m of level.solutionMini ?? []) dirs.push(m.dir);
      for (const dir of dirs) {
        expect(level.arrows, `${level.id} uses ${dir}`).toContain(dir);
      }
    }
  });

  it('keeps start, goal and walls inside the grid, and start clear of walls', () => {
    for (const level of LEVELS) {
      for (const cell of [level.start, level.goal, ...level.walls]) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(level.width);
        expect(cell.y).toBeLessThan(level.height);
      }
      expect(level.walls.some((w) => w.x === level.start.x && w.y === level.start.y)).toBe(false);
      expect(level.walls.some((w) => w.x === level.goal.x && w.y === level.goal.y)).toBe(false);
    }
  });

  it('requires a mini body wherever miniSlots is set', () => {
    for (const level of LEVELS.filter((l) => l.miniSlots > 0)) {
      expect(level.solutionMini, `${level.id} needs solutionMini`).toBeDefined();
      expect(level.solutionMini!.length).toBeLessThanOrEqual(level.miniSlots);
    }
  });

  it('derives par from the solution tile count', () => {
    expect(par(levelById(firstLevelId()))).toBe(levelById(firstLevelId()).solution.length);
  });

  it('chains levels in order and ends with null', () => {
    let id: string | null = firstLevelId();
    let count = 0;
    while (id) { count++; id = nextLevelId(id); }
    expect(count).toBe(LEVELS.length);
  });
});
