import { describe, it, expect } from 'vitest';
import { PARTS, partById, partsInSlot, nextUnearnedPart, SLOTS } from '../../src/engine/parts';

describe('parts catalogue', () => {
  it('has unique ids', () => {
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only uses known slots', () => {
    for (const part of PARTS) expect(SLOTS).toContain(part.slot);
  });

  it('offers at least two choices in every slot, so the garage is worth visiting', () => {
    for (const slot of SLOTS) expect(partsInSlot(slot).length).toBeGreaterThanOrEqual(2);
  });

  it('has at least as many parts as there are levels to earn them', () => {
    // 15 robot levels + 14 lightbulb levels, each capable of a tidy bonus.
    expect(PARTS.length).toBeGreaterThanOrEqual(29);
  });

  it('looks a part up by id', () => {
    expect(partById(PARTS[0].id)).toEqual(PARTS[0]);
  });

  it('throws on an unknown id', () => {
    expect(() => partById('nope')).toThrow();
  });

  it('prefixes every part id with its slot', () => {
    for (const part of PARTS) expect(part.id.startsWith(`${part.slot}-`)).toBe(true);
  });
});

describe('nextUnearnedPart', () => {
  it('returns the first part when nothing is owned', () => {
    expect(nextUnearnedPart([])).toBe(PARTS[0].id);
  });

  it('skips parts already owned', () => {
    expect(nextUnearnedPart([PARTS[0].id])).toBe(PARTS[1].id);
  });

  it('returns null once everything is owned', () => {
    expect(nextUnearnedPart(PARTS.map((p) => p.id))).toBeNull();
  });
});
