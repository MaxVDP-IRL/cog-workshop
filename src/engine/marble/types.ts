export type MarblePieceKind = 'ramp-left' | 'ramp-right' | 'splitter' | 'bucket';

export interface Cell {
  x: number; // column, 0 at the left, increasing rightwards
  y: number; // row, 0 at the top, increasing downwards
}

export interface MarblePiece {
  cell: Cell;
  kind: MarblePieceKind;
}

export interface Level {
  id: string;
  world: 1 | 2 | 3;
  width: number;
  height: number;
  /** Where the single marble starts, always row 0. */
  spawn: Cell;
  /** Cells that must each catch at least one marble by the end of the run. */
  targets: Cell[];
  /** Capacity of the piece budget, counted in placed pieces (ramps + splitters + buckets). */
  slots: number;
  /** Non-bucket piece kinds this level offers. Bucket is always offered. */
  palette: Exclude<MarblePieceKind, 'bucket'>[];
  /**
   * A known-good placement. Used by the content test to prove the level is
   * solvable, and its length defines par for the tidy bonus.
   */
  solution: MarblePiece[];
}

export interface TickState {
  marbles: Cell[];
}

export interface Trace {
  ticks: TickState[];
  /** Per-cell caught count, keyed `"x,y"` — only cells holding a placed bucket ever appear here. */
  caught: Record<string, number>;
}
