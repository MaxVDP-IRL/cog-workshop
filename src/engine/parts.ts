export const SLOTS = ['head', 'body', 'wheels', 'arms', 'antenna'] as const;

export type Slot = (typeof SLOTS)[number];

export interface Part {
  id: string;
  slot: Slot;
  /** Rendered directly in the garage and the award pop-up. */
  glyph: string;
  /** Spoken aloud when earned. Never the only way to understand the screen. */
  label: string;
}

/**
 * Award order. Parts are earned in this sequence, one per level completed,
 * plus one extra for each level solved in par tiles.
 */
export const PARTS: Part[] = [
  { id: 'head-classic', slot: 'head', glyph: '🤖', label: 'a robot head' },
  { id: 'wheels-red', slot: 'wheels', glyph: '🛞', label: 'red wheels' },
  { id: 'antenna-star', slot: 'antenna', glyph: '⭐', label: 'a star aerial' },
  { id: 'body-box', slot: 'body', glyph: '📦', label: 'a box body' },
  { id: 'arms-claw', slot: 'arms', glyph: '🦾', label: 'claw arms' },
  { id: 'head-cat', slot: 'head', glyph: '🐱', label: 'a cat head' },
  { id: 'wheels-tank', slot: 'wheels', glyph: '🚜', label: 'tank tracks' },
  { id: 'antenna-bulb', slot: 'antenna', glyph: '💡', label: 'a light bulb aerial' },
  { id: 'body-rocket', slot: 'body', glyph: '🚀', label: 'a rocket body' },
  { id: 'arms-magnet', slot: 'arms', glyph: '🧲', label: 'magnet arms' },
  { id: 'head-dino', slot: 'head', glyph: '🦖', label: 'a dinosaur head' },
  { id: 'wheels-ball', slot: 'wheels', glyph: '⚽', label: 'ball wheels' },
  { id: 'antenna-flower', slot: 'antenna', glyph: '🌻', label: 'a flower aerial' },
  { id: 'body-crystal', slot: 'body', glyph: '💎', label: 'a crystal body' },
  { id: 'arms-wing', slot: 'arms', glyph: '🪽', label: 'wings' },
  { id: 'head-owl', slot: 'head', glyph: '🦉', label: 'an owl head' },
  { id: 'wheels-spring', slot: 'wheels', glyph: '🌀', label: 'springy wheels' },
  { id: 'antenna-rainbow', slot: 'antenna', glyph: '🌈', label: 'a rainbow aerial' },
  { id: 'body-drum', slot: 'body', glyph: '🥁', label: 'a drum body' },
  { id: 'arms-balloon', slot: 'arms', glyph: '🎈', label: 'balloon arms' },
];

export const partById = (id: string): Part => {
  const part = PARTS.find((p) => p.id === id);
  if (!part) throw new Error(`unknown part: ${id}`);
  return part;
};

export const partsInSlot = (slot: Slot): Part[] => PARTS.filter((p) => p.slot === slot);

/** The next part to award, or null when everything has been earned. */
export const nextUnearnedPart = (owned: string[]): string | null =>
  PARTS.find((p) => !owned.includes(p.id))?.id ?? null;
