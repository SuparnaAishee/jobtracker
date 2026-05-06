import { apiFetch } from './client';

export interface AssistantStatus {
  configured: boolean;
}
export interface AnalyzeJdRequest {
  jobDescription: string;
  resume?: string | null;
}
export interface AnalyzeJdResponse {
  fitScore: number;
  strengths: string[];
  gaps: string[];
  suggestedKeywords: string[];
  summary: string;
}
export interface CoverLetterRequest {
  jobDescription: string;
  resume: string;
  companyName: string;
  position: string;
  tone?: string | null;
}
export interface CoverLetterResponse {
  coverLetter: string;
}

export interface InterviewQuestionsRequest {
  jobDescription: string;
  resume?: string | null;
  role?: string | null;
  count?: number | null;
}
export interface InterviewQuestionItem {
  question: string;
  category: string;
  difficulty: string;
  whyAsked: string;
}
export interface InterviewQuestionsResponse {
  questions: InterviewQuestionItem[];
}
export interface GradeAnswerRequest {
  question: string;
  userAnswer: string;
  jobDescription?: string | null;
  resume?: string | null;
}
export interface GradeAnswerResponse {
  score: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

export const status = () => apiFetch<AssistantStatus>('/api/assistant/status');
export const analyze = (body: AnalyzeJdRequest) =>
  apiFetch<AnalyzeJdResponse>('/api/assistant/analyze-jd', {
    method: 'POST',
    body: JSON.stringify(body)
  });
export const coverLetter = (body: CoverLetterRequest) =>
  apiFetch<CoverLetterResponse>('/api/assistant/cover-letter', {
    method: 'POST',
    body: JSON.stringify(body)
  });
export const interviewQuestions = (body: InterviewQuestionsRequest) =>
  apiFetch<InterviewQuestionsResponse>('/api/assistant/interview-questions', {
    method: 'POST',
    body: JSON.stringify(body)
  });
export const gradeAnswer = (body: GradeAnswerRequest) =>
  apiFetch<GradeAnswerResponse>('/api/assistant/grade-answer', {
    method: 'POST',
    body: JSON.stringify(body)
  });
