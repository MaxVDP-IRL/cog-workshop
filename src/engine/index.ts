export { run } from './robot/simulator';
export { LEVELS, levelById, firstLevelId, nextLevelId, par } from './robot/levels';
export type {
  Cell, Direction, Instruction, Level, MiniInstruction, MoveInstruction,
  RepeatInstruction, StepOutcome, Trace, TraceStep,
} from './robot/types';

export { PARTS, SLOTS, partById, partsInSlot, nextUnearnedPart } from './parts';
export type { Part, Slot } from './parts';

export { newProgress, isLevelUnlocked, completeLevel, equippedOrDefault } from './progress';
export type { ProgressState } from './progress';
