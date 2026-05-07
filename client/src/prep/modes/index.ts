import { practiceMode } from './practice';
import { mockMode } from './mock';
import type { SessionMode } from '../types';

export const MODES: SessionMode[] = [practiceMode, mockMode];

export function getMode(id: string): SessionMode {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
