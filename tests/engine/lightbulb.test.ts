import { describe, it, expect } from 'vitest';
import { toggle, isOn, litCount, nextCount, MAX_LIT } from '../../src/engine/lightbulb/machine';

describe('toggle', () => {
  it('turns a switch on from off', () => {
    expect(toggle(0, 4)).toBe(4);
  });

  it('turns a switch off from on', () => {
    expect(toggle(4, 4)).toBe(0);
  });

  it('leaves other switches untouched', () => {
    expect(toggle(0b00101, 0b00010)).toBe(0b00111);
  });
});

describe('isOn', () => {
  it('reports a lit switch as on', () => {
    expect(isOn(0b00110, 2)).toBe(true);
    expect(isOn(0b00110, 4)).toBe(true);
  });

  it('reports an unlit switch as off', () => {
    expect(isOn(0b00110, 1)).toBe(false);
    expect(isOn(0b00110, 8)).toBe(false);
  });
});

describe('litCount', () => {
  it('counts zero for nothing lit', () => {
    expect(litCount(0)).toBe(0);
  });

  it('counts each lit bit once', () => {
    expect(litCount(1)).toBe(1);
    expect(litCount(3)).toBe(2);
    expect(litCount(7)).toBe(3);
    expect(litCount(31)).toBe(5);
  });
});

describe('nextCount', () => {
  it('increments by one', () => {
    expect(nextCount(0)).toBe(1);
    expect(nextCount(5)).toBe(6);
  });

  it('wraps back to zero after the maximum', () => {
    expect(nextCount(MAX_LIT)).toBe(0);
  });

  it('has a maximum of 31 with all five switches', () => {
    expect(MAX_LIT).toBe(31);
  });
});
