import type { ReactNode } from 'react';
import type { GradeAnswerResponse, InterviewQuestionItem } from '../api/assistant';

export type SessionPhase = 'setup' | 'running' | 'submitting' | 'review';

export type Category = 'Behavioral' | 'Technical' | 'System Design' | 'Role-specific' | 'Culture fit';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export const ALL_CATEGORIES: Category[] = ['Behavioral', 'Technical', 'System Design', 'Role-specific', 'Culture fit'];
export const ALL_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export interface SessionConfig {
  modeId: string;
  jobDescription: string;
  resume: string;
  role: string;
  count: number;
  categoryFilter: Category[];
  difficultyFilter: Difficulty[];
  totalTimeSec?: number;
  perQuestionSoftLimitSec?: number;
  lockModelAnswers?: boolean;
}

export interface QuestionState {
  q: InterviewQuestionItem;
  answer: string;
  flagged: boolean;
  feedback: GradeAnswerResponse | null;
  feedbackError: string | null;
  feedbackPending: boolean;
  showModelAnswer: boolean;
}

export interface SessionState {
  id: string;
  config: SessionConfig;
  phase: SessionPhase;
  startedAt: string;
  finishedAt: string | null;
  questions: QuestionState[];
  currentIndex: number;
  remainingSec: number | null;
}

export interface SessionMode {
  id: string;
  label: string;
  tagline: string;
  bullets: string[];
  defaults: Partial<SessionConfig>;
  SetupExtras: (props: SetupExtrasProps) => ReactNode;
  Running: (props: RunningProps) => ReactNode;
  Review: (props: ReviewProps) => ReactNode;
}

export interface SetupExtrasProps {
  config: SessionConfig;
  setConfig: (patch: Partial<SessionConfig>) => void;
}

export interface RunningProps {
  state: SessionState;
  setQuestion: (index: number, patch: Partial<QuestionState>) => void;
  setCurrentIndex: (index: number) => void;
  setRemaining: (sec: number) => void;
  gradeOne: (index: number) => void;
  submitAll: () => void;
  finishWithoutSubmit: () => void;
}

export interface ReviewProps {
  state: SessionState;
  startNewSession: () => void;
  retryWeak: () => void;
}

export function newQuestionState(q: InterviewQuestionItem): QuestionState {
  return {
    q,
    answer: '',
    flagged: false,
    feedback: null,
    feedbackError: null,
    feedbackPending: false,
    showModelAnswer: false
  };
}
