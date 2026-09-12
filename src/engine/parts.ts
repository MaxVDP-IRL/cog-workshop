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
  { id: 'head-frog', slot: 'head', glyph: '🐸', label: 'a frog head' },
  { id: 'wheels-skate', slot: 'wheels', glyph: '🛼', label: 'roller-skate wheels' },
  { id: 'antenna-kite', slot: 'antenna', glyph: '🪁', label: 'a kite aerial' },
  { id: 'body-vase', slot: 'body', glyph: '🏺', label: 'a vase body' },
  { id: 'arms-chopsticks', slot: 'arms', glyph: '🥢', label: 'chopstick arms' },
  { id: 'head-fox', slot: 'head', glyph: '🦊', label: 'a fox head' },
  { id: 'wheels-donut', slot: 'wheels', glyph: '🍩', label: 'donut wheels' },
  { id: 'antenna-bell', slot: 'antenna', glyph: '🔔', label: 'a bell aerial' },
  { id: 'body-basket', slot: 'body', glyph: '🧺', label: 'a basket body' },
  { id: 'arms-hook', slot: 'arms', glyph: '🪝', label: 'hook arms' },
  { id: 'head-panda', slot: 'head', glyph: '🐼', label: 'a panda head' },
  { id: 'wheels-frisbee', slot: 'wheels', glyph: '🥏', label: 'frisbee wheels' },
  { id: 'antenna-candle', slot: 'antenna', glyph: '🕯️', label: 'a candle aerial' },
  { id: 'body-gift', slot: 'body', glyph: '🎁', label: 'a gift box body' },
  { id: 'arms-hand', slot: 'arms', glyph: '🖐️', label: 'a friendly hand' },
  { id: 'head-penguin', slot: 'head', glyph: '🐧', label: 'a penguin head' },
  { id: 'wheels-ferris', slot: 'wheels', glyph: '🎡', label: 'ferris wheels' },
  { id: 'antenna-firework', slot: 'antenna', glyph: '🎆', label: 'a firework aerial' },
  { id: 'body-bag', slot: 'body', glyph: '🛍️', label: 'a shopping bag body' },
  { id: 'arms-fishing', slot: 'arms', glyph: '🎣', label: 'fishing-rod arms' },
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
