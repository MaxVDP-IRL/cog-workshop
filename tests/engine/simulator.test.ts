import { describe, it, expect } from 'vitest';
import { run } from '../../src/engine/robot/simulator';
import type { Level } from '../../src/engine/robot/types';

// A 3-wide, 3-tall open room. Robot bottom-left, goal bottom-right.
const room: Level = {
  id: 'test-room',
  world: 2,
  width: 3,
  height: 3,
  start: { x: 0, y: 2 },
  goal: { x: 2, y: 2 },
  walls: [],
  slots: 6,
  arrows: ['up', 'down', 'left', 'right'],
  repeatAllowed: false,
  miniSlots: 0,
  solution: [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'right' }],
};

describe('run — basic movement', () => {
  it('does nothing for an empty program', () => {
    const trace = run(room, []);
    expect(trace.steps).toEqual([]);
    expect(trace.end).toEqual({ x: 0, y: 2 });
    expect(trace.status).toBe('stopped');
    expect(trace.crashAt).toBeNull();
  });

  it('moves right and reaches the goal', () => {
    const trace = run(room, [{ kind: 'move', dir: 'right' }, { kind: 'move', dir: 'right' }]);
    expect(trace.status).toBe('goal');
    expect(trace.end).toEqual({ x: 2, y: 2 });
    expect(trace.steps).toHaveLength(2);
    expect(trace.steps[0]).toEqual({
      path: [0], from: { x: 0, y: 2 }, to: { x: 1, y: 2 }, outcome: 'moved',
    });
  });

  it('treats up as decreasing y and down as increasing y', () => {
    const up = run(room, [{ kind: 'move', dir: 'up' }]);
    expect(up.end).toEqual({ x: 0, y: 1 });
    const down = run({ ...room, start: { x: 0, y: 0 } }, [{ kind: 'move', dir: 'down' }]);
    expect(down.end).toEqual({ x: 0, y: 1 });
  });

  it('stops at the goal without running later tiles', () => {
    const trace = run(room, [
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'up' },
    ]);
    expect(trace.status).toBe('goal');
    expect(trace.steps).toHaveLength(2);
  });

  it('crashes into the grid edge and reports the offending tile', () => {
    const trace = run(room, [{ kind: 'move', dir: 'left' }]);
    expect(trace.status).toBe('crashed');
    expect(trace.crashAt).toEqual([0]);
    expect(trace.end).toEqual({ x: 0, y: 2 });
    expect(trace.steps[0].outcome).toBe('blocked');
  });

  it('crashes into a wall and halts the rest of the program', () => {
    const walled: Level = { ...room, walls: [{ x: 1, y: 2 }] };
    const trace = run(walled, [
      { kind: 'move', dir: 'right' },
      { kind: 'move', dir: 'right' },
    ]);
    expect(trace.status).toBe('crashed');
    expect(trace.crashAt).toEqual([0]);
    expect(trace.steps).toHaveLength(1);
    expect(trace.end).toEqual({ x: 0, y: 2 });
  });
});

describe('run — repeat', () => {
  // A 1-wide, 6-tall corridor. Robot at the bottom, goal at the top.
  const corridor: Level = {
    id: 'test-corridor',
    world: 3,
    width: 1,
    height: 6,
    start: { x: 0, y: 5 },
    goal: { x: 0, y: 0 },
    walls: [],
    slots: 2,
    arrows: ['up'],
    repeatAllowed: true,
    miniSlots: 0,
    solution: [{ kind: 'repeat', times: 5, body: [{ kind: 'move', dir: 'up' }] }],
  };

  it('expands a repeat into one step per iteration', () => {
    const trace = run(corridor, [
      { kind: 'repeat', times: 5, body: [{ kind: 'move', dir: 'up' }] },
    ]);
    expect(trace.status).toBe('goal');
    expect(trace.steps).toHaveLength(5);
    expect(trace.end).toEqual({ x: 0, y: 0 });
  });

  it('paths repeat body steps as [tileIndex, bodyIndex]', () => {
    const trace = run(corridor, [
      { kind: 'repeat', times: 2, body: [{ kind: 'move', dir: 'up' }] },
    ]);
    expect(trace.steps.map((s) => s.path)).toEqual([[0, 0], [0, 0]]);
  });

  it('runs a multi-move body in order each iteration', () => {
    const room: Level = {
      ...corridor, width: 3, height: 3,
      start: { x: 0, y: 2 }, goal: { x: 2, y: 0 }, arrows: ['up', 'right'],
      solution: [{ kind: 'repeat', times: 2, body: [
        { kind: 'move', dir: 'right' }, { kind: 'move', dir: 'up' },
      ] }],
    };
    const trace = run(room, [{ kind: 'repeat', times: 2, body: [
      { kind: 'move', dir: 'right' }, { kind: 'move', dir: 'up' },
    ] }]);
    expect(trace.status).toBe('goal');
    expect(trace.steps.map((s) => s.path)).toEqual([[0, 0], [0, 1], [0, 0], [0, 1]]);
    expect(trace.end).toEqual({ x: 2, y: 0 });
  });

  it('crashes mid-repeat and reports the body tile that failed', () => {
    const trace = run(corridor, [
      { kind: 'repeat', times: 9, body: [{ kind: 'move', dir: 'up' }] },
    ]);
    // Reaches the goal on the 5th iteration, so it never gets to crash.
    expect(trace.status).toBe('goal');

    const noGoal: Level = { ...corridor, goal: { x: 0, y: 99 } };
    const crash = run(noGoal, [
      { kind: 'repeat', times: 9, body: [{ kind: 'move', dir: 'up' }] },
    ]);
    expect(crash.status).toBe('crashed');
    expect(crash.crashAt).toEqual([0, 0]);
    expect(crash.end).toEqual({ x: 0, y: 0 });
  });

  it('treats a zero-times repeat as a no-op', () => {
    const trace = run(corridor, [{ kind: 'repeat', times: 0, body: [{ kind: 'move', dir: 'up' }] }]);
    expect(trace.steps).toEqual([]);
    expect(trace.status).toBe('stopped');
  });
});
