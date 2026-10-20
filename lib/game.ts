import type { SyllableResult } from './judge';

export const MAX_TRIES = 6;
export const WORDS_PER_DAY = 5;
/** 이만큼 틀리면 주제, 그다음 설명을 알려준다 */
export const TOPIC_AFTER = 3;
export const CLUE_AFTER = 5;
/** 1일차 퍼즐이 열리는 날 (한국 시간) */
export const LAUNCH_DATE = '2026-10-19';

const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/** 한국 시간 기준 오늘 날짜 (YYYY-MM-DD) */
export function kstDate(now: number): string {
  return new Date(now + KST_OFFSET).toISOString().slice(0, 10);
}

/** 다음 퍼즐(한국 시간 자정)까지 남은 밀리초 */
export function msUntilNextPuzzle(now: number): number {
  return DAY - ((now + KST_OFFSET) % DAY);
}

/** 서버가 알려주는 그날의 퍼즐. 정답은 없고 초성과 글자 수만 있다. */
export type PuzzleInfo = { date: string; day: number; words: { length: number; choseong: string }[] };

/** 서버가 돌려주는 입력 하나의 판정 */
export type GuessResult = {
  word: string;
  result: SyllableResult[];
  solved: boolean;
  /** 맞혔거나 마지막 기회를 쓴 뒤에만 온다 */
  answer?: string;
  /** 틀린 횟수가 TOPIC_AFTER에 닿으면 오는 주제 */
  topic?: string;
  /** 틀린 횟수가 CLUE_AFTER에 닿으면 오는 한 줄 설명 */
  clue?: string;
};

export type WordState = {
  guesses: GuessResult[];
  status: 'playing' | 'solved' | 'failed';
  answer?: string;
  topic?: string;
  clue?: string;
};
export type GameState = { date: string; current: number; words: WordState[] };

export function newGame(date: string): GameState {
  return {
    date,
    current: 0,
    words: Array.from({ length: WORDS_PER_DAY }, () => ({ guesses: [], status: 'playing' as const })),
  };
}

export function isFinished(state: GameState): boolean {
  return state.words.every((w) => w.status !== 'playing');
}

/** 서버 판정 하나를 반영한 새 상태 */
export function applyGuess(state: GameState, guess: GuessResult): GameState {
  const words = state.words.map((w, i) => {
    if (i !== state.current) return w;
    const guesses = [...w.guesses, guess];
    const status = guess.solved ? 'solved' : guesses.length >= MAX_TRIES ? 'failed' : 'playing';
    return {
      guesses,
      status,
      answer: guess.answer ?? w.answer,
      topic: guess.topic ?? w.topic,
      clue: guess.clue ?? w.clue,
    } as WordState;
  });
  return { ...state, words };
}

export function goToNextWord(state: GameState): GameState {
  return { ...state, current: Math.min(state.current + 1, WORDS_PER_DAY - 1) };
}

/** 맞히면 남은 기회 + 1점(1번에 맞히면 6점), 못 맞히면 0점. 만점 30점. */
export function wordScore(word: WordState): number {
  return word.status === 'solved' ? MAX_TRIES + 1 - word.guesses.length : 0;
}

export function totalScore(state: GameState): number {
  return state.words.reduce((sum, w) => sum + wordScore(w), 0);
}

export function gradeOf(score: number): string {
  if (score >= 25) return '맞츄왕';
  if (score >= 18) return '단어 고수';
  if (score >= 10) return '순항 중';
  return '내일은 맞츄';
}

const NUMBERS = ['①', '②', '③', '④', '⑤'];

function rowEmoji(result: SyllableResult[]): string {
  return result
    .map((s) => (s.marks.every((m) => m === 'correct') ? '🟩' : s.marks.some((m) => m !== 'absent') ? '🟨' : '⬜'))
    .join('');
}

/** 정답이 드러나지 않는 공유 문구 */
export function shareText(state: GameState, day: number, url: string): string {
  const lines = state.words.map((w, i) => {
    const rows = w.guesses.map((g) => rowEmoji(g.result)).join(' ');
    const tries = w.status === 'solved' ? `${w.guesses.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
    return `${NUMBERS[i]} ${rows} (${tries})`;
  });
  const score = totalScore(state);
  return [`맞츄 ${day}일차 ${score}/30 ${gradeOf(score)}`, ...lines, url].join('\n');
}
