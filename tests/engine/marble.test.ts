import { describe, it, expect } from 'vitest';
import { run } from '../../src/engine/marble/simulator';
import type { Level } from '../../src/engine/marble/types';

// A 3-wide, 3-tall board. Marble spawns top-middle.
const board: Level = {
  id: 'test-board',
  world: 1,
  width: 3,
  height: 3,
  spawn: { x: 1, y: 0 },
  targets: [{ x: 1, y: 2 }],
  slots: 3,
  palette: ['ramp-left', 'ramp-right'],
  solution: [{ cell: { x: 1, y: 2 }, kind: 'bucket' }],
};

describe('run — falling straight', () => {
  it('falls straight down with no pieces placed', () => {
    const trace = run(board, []);
    // height 3: rows 0,1,2 are valid, then the attempt to move past row 2
    // drops the marble, appending one final empty tick (height + 1 ticks
    // total) — the same pattern the "always terminates" test below relies on.
    expect(trace.ticks).toHaveLength(4);
    expect(trace.ticks[0]).toEqual({ marbles: [{ x: 1, y: 0 }] });
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 1, y: 1 }] });
    expect(trace.ticks[2]).toEqual({ marbles: [{ x: 1, y: 2 }] });
    expect(trace.ticks[3]).toEqual({ marbles: [] });
    expect(trace.caught).toEqual({});
  });

  it('catches a marble that lands on a bucket', () => {
    const trace = run(board, [{ cell: { x: 1, y: 2 }, kind: 'bucket' }]);
    expect(trace.caught).toEqual({ '1,2': 1 });
    // A caught marble is removed from play the next tick — the trace stops growing.
    expect(trace.ticks.at(-1)).toEqual({ marbles: [] });
  });
});

describe('run — ramps', () => {
  it('shifts the marble left through a ramp-left piece', () => {
    const trace = run(board, [{ cell: { x: 1, y: 0 }, kind: 'ramp-left' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 0, y: 1 }] });
  });

  it('shifts the marble right through a ramp-right piece', () => {
    const trace = run(board, [{ cell: { x: 1, y: 0 }, kind: 'ramp-right' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 2, y: 1 }] });
  });

  it('only redirects on the tick the marble is actually in that cell', () => {
    // A ramp at (0,1) does nothing to a marble that never passes through (0,1).
    const trace = run(board, [{ cell: { x: 1, y: 0 }, kind: 'ramp-right' }, { cell: { x: 0, y: 1 }, kind: 'ramp-left' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 2, y: 1 }] });
    expect(trace.ticks[2]).toEqual({ marbles: [{ x: 2, y: 2 }] });
  });
});

describe('run — splitter', () => {
  it('replaces one marble with two, one down-left and one down-right', () => {
    const trace = run(board, [{ cell: { x: 1, y: 0 }, kind: 'splitter' }]);
    expect(trace.ticks[1].marbles).toEqual(
      expect.arrayContaining([{ x: 0, y: 1 }, { x: 2, y: 1 }]),
    );
    expect(trace.ticks[1].marbles).toHaveLength(2);
  });

  it('catches both clones independently if each lands on its own bucket', () => {
    const wide: Level = { ...board, width: 3, height: 2 };
    const trace = run(wide, [
      { cell: { x: 1, y: 0 }, kind: 'splitter' },
      { cell: { x: 0, y: 1 }, kind: 'bucket' },
      { cell: { x: 2, y: 1 }, kind: 'bucket' },
    ]);
    expect(trace.caught).toEqual({ '0,1': 1, '2,1': 1 });
  });

  it('drops an off-grid clone in the same tick, not one tick later', () => {
    // Splitter at the left edge: its left clone (x=-1) is off-grid and must
    // be silently absent from the very next tick, matching how a ramp drops
    // a marble off the edge in the same tick it goes off-grid.
    const edge: Level = { ...board, spawn: { x: 0, y: 0 } };
    const trace = run(edge, [{ cell: { x: 0, y: 0 }, kind: 'splitter' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [{ x: 1, y: 1 }] });
  });

  it('accumulates the count when two marbles land in the same bucket cell', () => {
    // Both splitter clones get redirected by ramps back into the same
    // column, so the same bucket cell catches two marbles: caught[k] must
    // go 1 -> 2, not just undefined -> 1.
    const trace = run(board, [
      { cell: { x: 1, y: 0 }, kind: 'splitter' },
      { cell: { x: 0, y: 1 }, kind: 'ramp-right' },
      { cell: { x: 2, y: 1 }, kind: 'ramp-left' },
      { cell: { x: 1, y: 2 }, kind: 'bucket' },
    ]);
    expect(trace.caught).toEqual({ '1,2': 2 });
  });
});

describe('run — leaving the grid', () => {
  it('drops a marble that ramps off the left edge, without catching it anywhere', () => {
    const edge: Level = { ...board, spawn: { x: 0, y: 0 } };
    const trace = run(edge, [{ cell: { x: 0, y: 0 }, kind: 'ramp-left' }]);
    expect(trace.ticks[1]).toEqual({ marbles: [] });
    expect(trace.caught).toEqual({});
  });

  it('always terminates within height ticks, regardless of board size', () => {
    const tall: Level = { ...board, height: 6, targets: [{ x: 1, y: 5 }] };
    const trace = run(tall, []);
    expect(trace.ticks.length).toBeLessThanOrEqual(tall.height + 1);
    expect(trace.ticks.at(-1)).toEqual({ marbles: [] });
  });
});

describe('run — empty program', () => {
  it('catches the marble on tick 0 then appends an empty final tick, for a height-1 level', () => {
    const flat: Level = { ...board, height: 1, spawn: { x: 1, y: 0 }, targets: [{ x: 1, y: 0 }] };
    const trace = run(flat, [{ cell: { x: 1, y: 0 }, kind: 'bucket' }]);
    expect(trace.ticks[0]).toEqual({ marbles: [{ x: 1, y: 0 }] });
    expect(trace.caught).toEqual({ '1,0': 1 });
    expect(trace.ticks).toHaveLength(2);
  });
});
