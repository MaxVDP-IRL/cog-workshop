import type { SwitchValue } from './types';
import { SWITCH_VALUES } from './types';

/**
 * The lit-switches state IS the total: switch values are powers of two with
 * no overlap, so a bitmask of "which switches are on" and "their sum" are
 * the same integer. Toggling a switch is therefore a single XOR.
 */
export const toggle = (lit: number, sw: SwitchValue): number => lit ^ sw;

/** Whether a given switch is currently lit. */
export const isOn = (lit: number, sw: SwitchValue): boolean => (lit & sw) !== 0;

/** How many switches are lit — the fewest possible taps to reach this state from off. */
export const litCount = (n: number): number =>
  n.toString(2).split('').filter((bit) => bit === '1').length;

/** The bitmask with every switch in the app turned on (all five: 1+2+4+8+16). */
export const MAX_LIT = SWITCH_VALUES.reduce((sum, sw) => sum + sw, 0);

/** The next state in the counting sequence, wrapping back to 0 after MAX_LIT. */
export const nextCount = (lit: number): number => (lit >= MAX_LIT ? 0 : lit + 1);
