import type { MarblePieceKind } from '../../engine';

export const PIECE_GLYPH: Record<MarblePieceKind, string> = {
  'ramp-left': '↙️',
  'ramp-right': '↘️',
  splitter: '🔀',
  bucket: '🪣',
};

export const PIECE_NAME: Record<MarblePieceKind, string> = {
  'ramp-left': 'ramp left',
  'ramp-right': 'ramp right',
  splitter: 'splitter',
  bucket: 'bucket',
};
