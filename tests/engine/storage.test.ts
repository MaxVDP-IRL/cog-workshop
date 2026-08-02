import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, saveProgress } from '../../src/platform/storage';
import { newProgress } from '../../src/engine';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  } as Storage;
});

describe('storage', () => {
  it('returns fresh progress when nothing is stored', () => {
    expect(loadProgress()).toEqual(newProgress());
  });

  it('round-trips saved progress', () => {
    const p = { ...newProgress(), completedLevels: ['w1-1'], parts: ['head-classic'] };
    saveProgress(p);
    expect(loadProgress()).toEqual(p);
  });

  it('recovers from corrupt JSON without throwing', () => {
    store.set('cog-workshop:progress', '{not json');
    const loaded = loadProgress();
    expect(loaded.completedLevels).toEqual([]);
    expect(loaded.storageWarning).toBe(true);
  });

  it('discards progress saved under a different version', () => {
    store.set('cog-workshop:progress', JSON.stringify({ version: 99, parts: ['x'] }));
    const loaded = loadProgress();
    expect(loaded.parts).toEqual([]);
    expect(loaded.storageWarning).toBe(true);
  });

  it('backfills fields missing from an older save', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1, completedLevels: ['w1-1'], parts: ['head-classic'],
    }));
    const loaded = loadProgress();
    expect(loaded.tidyLevels).toEqual([]);
    expect(loaded.equipped).toEqual({});
  });

  it('does not persist the transient storageWarning flag', () => {
    saveProgress({ ...newProgress(), storageWarning: true } as never);
    expect(JSON.parse(store.get('cog-workshop:progress')!)).not.toHaveProperty('storageWarning');
  });

  it('drops unknown part ids while keeping valid ones', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1,
      completedLevels: [],
      tidyLevels: [],
      parts: ['head-classic', 'head-bogus'],
      equipped: {},
    }));
    const loaded = loadProgress();
    expect(loaded.parts).toEqual(['head-classic']);
  });

  it('drops unknown level ids from completedLevels and tidyLevels while keeping valid ones', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1,
      completedLevels: ['w1-1', 'no-such-level'],
      tidyLevels: ['w1-1', 'no-such-level'],
      parts: [],
      equipped: {},
    }));
    const loaded = loadProgress();
    expect(loaded.completedLevels).toEqual(['w1-1']);
    expect(loaded.tidyLevels).toEqual(['w1-1']);
  });

  it('drops an equipped slot mapped to an unknown part id while keeping a valid mapping', () => {
    store.set('cog-workshop:progress', JSON.stringify({
      version: 1,
      completedLevels: [],
      tidyLevels: [],
      parts: [],
      equipped: { head: 'head-classic', body: 'body-bogus' },
    }));
    const loaded = loadProgress();
    expect(loaded.equipped).toEqual({ head: 'head-classic' });
  });

  it('treats a non-plain-object equipped field as empty rather than misreading it', () => {
    const withArray = { ...newProgress(), equipped: ['head-classic', 'body-bogus'] };
    store.set('cog-workshop:progress', JSON.stringify(withArray));
    expect(loadProgress().equipped).toEqual({});

    const withNull = { ...newProgress(), equipped: null };
    store.set('cog-workshop:progress', JSON.stringify(withNull));
    expect(loadProgress().equipped).toEqual({});

    const withString = { ...newProgress(), equipped: 'head-classic' };
    store.set('cog-workshop:progress', JSON.stringify(withString));
    expect(loadProgress().equipped).toEqual({});
  });
});
