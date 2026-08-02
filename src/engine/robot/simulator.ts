import type { Cell, Direction, Instruction, Level, MoveInstruction, Trace, TraceStep } from './types';

const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

const blocked = (level: Level, cell: Cell): boolean =>
  cell.x < 0 || cell.y < 0 || cell.x >= level.width || cell.y >= level.height ||
  level.walls.some((w) => same(w, cell));

/**
 * Executes a program against a level, returning a deterministic trace.
 * Execution halts on reaching the goal or on the first blocked move.
 */
export const run = (
  level: Level,
  program: Instruction[],
  mini: MoveInstruction[] = [],
): Trace => {
  const steps: TraceStep[] = [];
  let at: Cell = { ...level.start };

  const applyMove = (move: MoveInstruction, path: number[]): 'goal' | 'crashed' | 'ok' => {
    const delta = DELTA[move.dir];
    const to: Cell = { x: at.x + delta.x, y: at.y + delta.y };
    if (blocked(level, to)) {
      steps.push({ path, from: at, to: at, outcome: 'blocked' });
      return 'crashed';
    }
    steps.push({ path, from: at, to, outcome: 'moved' });
    at = to;
    return same(at, level.goal) ? 'goal' : 'ok';
  };

  for (let i = 0; i < program.length; i++) {
    const instruction = program[i];

    if (instruction.kind === 'move') {
      const result = applyMove(instruction, [i]);
      if (result === 'goal') return { steps, end: at, status: 'goal', crashAt: null };
      if (result === 'crashed') return { steps, end: at, status: 'crashed', crashAt: [i] };
    }

    if (instruction.kind === 'repeat') {
      for (let iteration = 0; iteration < instruction.times; iteration++) {
        for (let b = 0; b < instruction.body.length; b++) {
          const result = applyMove(instruction.body[b], [i, b]);
          if (result === 'goal') return { steps, end: at, status: 'goal', crashAt: null };
          if (result === 'crashed') return { steps, end: at, status: 'crashed', crashAt: [i, b] };
        }
      }
    }

    if (instruction.kind === 'mini') {
      for (let b = 0; b < mini.length; b++) {
        const result = applyMove(mini[b], [i, b]);
        if (result === 'goal') return { steps, end: at, status: 'goal', crashAt: null };
        if (result === 'crashed') return { steps, end: at, status: 'crashed', crashAt: [i, b] };
      }
    }
  }

  return { steps, end: at, status: 'stopped', crashAt: null };
};
