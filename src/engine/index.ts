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

export { run as runMarble } from './marble/simulator';
export type {
  Cell as MarbleCell, MarblePiece, MarblePieceKind, Level as MarbleLevel,
  TickState as MarbleTickState, Trace as MarbleTrace,
} from './marble/types';
export {
  LEVELS as MARBLE_LEVELS, levelById as marbleLevelById,
  firstLevelId as firstMarbleLevelId, nextLevelId as marbleNextLevelId,
  par as marblePar,
} from './marble/levels';

export { PARTS, SLOTS, partById, partsInSlot, nextUnearnedPart } from './parts';
export type { Part, Slot } from './parts';

export {
  newProgress, isLevelUnlocked, completeLevel,
  isLightbulbLevelUnlocked, completeLightbulbLevel,
  isMarbleLevelUnlocked, completeMarbleLevel, equippedOrDefault,
} from './progress';
export type { ProgressState } from './progress';
