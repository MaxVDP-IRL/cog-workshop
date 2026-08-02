export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  x: number; // column, 0 at the left, increasing rightwards
  y: number; // row, 0 at the top, increasing downwards
}

/** A single step. The arrow IS the move — there is no turn instruction. */
export interface MoveInstruction {
  kind: 'move';
  dir: Direction;
}

/** Runs its body `times` times. Body holds moves only — repeats never nest. */
export interface RepeatInstruction {
  kind: 'repeat';
  times: number;
  body: MoveInstruction[];
}

/** Invokes the level's mini-program. The mini body holds moves only. */
export interface MiniInstruction {
  kind: 'mini';
}

export type Instruction = MoveInstruction | RepeatInstruction | MiniInstruction;

export interface Level {
  id: string;
  world: 1 | 2 | 3 | 4;
  width: number;
  height: number;
  start: Cell;
  goal: Cell;
  walls: Cell[];
  /** Capacity of the program strip, counted in top-level tiles. */
  slots: number;
  /** Which arrow buttons this level offers. World 1 offers exactly one. */
  arrows: Direction[];
  repeatAllowed: boolean;
  /** Capacity of the mini-program strip. 0 means this level has no mini-program. */
  miniSlots: number;
  /**
   * A known-good program. Used by the content test to prove the level is
   * solvable, and its top-level tile count defines par for the tidy bonus.
   */
  solution: Instruction[];
  /** Mini-program body the solution assumes. Required when miniSlots > 0. */
  solutionMini?: MoveInstruction[];
}

export type StepOutcome = 'moved' | 'blocked';

export interface TraceStep {
  /**
   * Index path to the tile that produced this step, for UI highlighting.
   * `[2]` is top-level tile 2. `[2, 1]` is body tile 1 inside the repeat at
   * top-level index 2. `[3, 0]` is body tile 0 of the mini invoked at index 3.
   */
  path: number[];
  from: Cell;
  to: Cell;
  outcome: StepOutcome;
}

export interface Trace {
  steps: TraceStep[];
  end: Cell;
  status: 'goal' | 'crashed' | 'stopped';
  /** Index path of the tile that crashed, or null. */
  crashAt: number[] | null;
}
