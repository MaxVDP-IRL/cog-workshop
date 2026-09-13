export type SwitchValue = 1 | 2 | 4 | 8 | 16;

export const SWITCH_VALUES: SwitchValue[] = [1, 2, 4, 8, 16];

export interface Level {
  id: string;
  /** Which of the four switch-count stages this level belongs to. */
  stage: 1 | 2 | 3 | 4;
  /** Switches visible and tappable at this level, in ascending value order. */
  switches: SwitchValue[];
  /** The number Oskar must light up. */
  target: number;
}
