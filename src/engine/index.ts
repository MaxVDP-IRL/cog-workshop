export { run } from './robot/simulator';
export { LEVELS, levelById, firstLevelId, nextLevelId, par } from './robot/levels';
export type {
  Cell, Direction, Instruction, Level, MiniInstruction, MoveInstruction,
  RepeatInstruction, StepOutcome, Trace, TraceStep,
} from './robot/types';

export { toggle, isOn, litCount, nextCount, MAX_LIT } from './lightbulb/machine';
export { SWITCH_VALUES } from './lightbulb/types';
export type { SwitchValue, Level as LightbulbLevel } from './lightbulb/types';
export {
  LEVELS as LIGHTBULB_LEVELS, levelById as lightbulbLevelById,
  firstLevelId as firstLightbulbLevelId, nextLevelId as lightbulbNextLevelId,
  par as lightbulbPar,
} from './lightbulb/levels';

export { PARTS, SLOTS, partById, partsInSlot, nextUnearnedPart } from './parts';
export type { Part, Slot } from './parts';

export {
  newProgress, isLevelUnlocked, completeLevel,
  isLightbulbLevelUnlocked, completeLightbulbLevel, equippedOrDefault,
} from './progress';
export type { ProgressState } from './progress';
