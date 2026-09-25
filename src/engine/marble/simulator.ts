import type { Cell, Level, MarblePiece, MarblePieceKind, Trace, TickState } from './types';

const key = (c: Cell): string => `${c.x},${c.y}`;

/** Whether a cell is still within the level's grid (a marble past this is dropped). */
const inBounds = (c: Cell, level: Level): boolean =>
  c.x >= 0 && c.x < level.width && c.y < level.height;

/**
 * Runs one marble (and whatever it clones into) through a placed board,
 * returning every tick's marble positions and how many marbles each bucket
 * caught. Pure and deterministic: no randomness, no physics, no collision
 * handling between marbles sharing a cell.
 */
export const run = (level: Level, pieces: MarblePiece[]): Trace => {
  const board = new Map<string, MarblePieceKind>();
  for (const p of pieces) board.set(key(p.cell), p.kind);

  let marbles: Cell[] = [{ ...level.spawn }];
  const ticks: TickState[] = [{ marbles: marbles.map((m) => ({ ...m })) }];
  const caught: Record<string, number> = {};

  for (let t = 0; t < level.height + 1 && marbles.length > 0; t++) {
    const next: Cell[] = [];
    for (const m of marbles) {
      const k = key(m);
      const kind = board.get(k);

      if (kind === 'bucket') {
        caught[k] = (caught[k] ?? 0) + 1;
        continue;
      }
      if (kind === 'splitter') {
        const left: Cell = { x: m.x - 1, y: m.y + 1 };
        const right: Cell = { x: m.x + 1, y: m.y + 1 };
        if (inBounds(left, level)) next.push(left);
        if (inBounds(right, level)) next.push(right);
        continue;
      }

      const dx = kind === 'ramp-left' ? -1 : kind === 'ramp-right' ? 1 : 0;
      const to: Cell = { x: m.x + dx, y: m.y + 1 };
      if (inBounds(to, level)) next.push(to);
    }
    marbles = next;
    ticks.push({ marbles: marbles.map((m) => ({ ...m })) });
  }

  return { ticks, caught };
};
