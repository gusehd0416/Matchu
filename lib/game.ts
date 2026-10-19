import puzzles from './puzzles.json';
import { judge, type SyllableResult } from './judge';

export const MAX_TRIES = 6;
export const WORDS_PER_DAY = 5;
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

/** 그날의 5단어. 프로토타입은 100일치를 돌려 쓰고, 정식 버전은 서버가 정답을 숨긴 채 판정한다. */
export function puzzleFor(date: string): { day: number; answers: string[] } {
  const offset = Math.round((Date.parse(date) - Date.parse(LAUNCH_DATE)) / DAY);
  const index = ((offset % puzzles.length) + puzzles.length) % puzzles.length;
  return { day: offset + 1, answers: puzzles[index] };
}

export type WordState = { guesses: string[]; status: 'playing' | 'solved' | 'failed' };
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

/** 입력 하나를 반영한 새 상태. 검사는 호출하는 쪽에서 끝낸 뒤 부른다. */
export function submitGuess(state: GameState, guess: string, answer: string): GameState {
  const words = state.words.map((w, i) => {
    if (i !== state.current) return w;
    const guesses = [...w.guesses, guess];
    const status = guess === answer ? 'solved' : guesses.length >= MAX_TRIES ? 'failed' : 'playing';
    return { guesses, status } as WordState;
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
export function shareText(state: GameState, answers: string[], url: string): string {
  const { day } = puzzleFor(state.date);
  const lines = state.words.map((w, i) => {
    const rows = w.guesses.map((g) => rowEmoji(judge(g, answers[i]))).join(' ');
    const tries = w.status === 'solved' ? `${w.guesses.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
    return `${NUMBERS[i]} ${rows} (${tries})`;
  });
  const score = totalScore(state);
  return [`맞츄 ${day}일차 ${score}/30 ${gradeOf(score)}`, ...lines, url].join('\n');
}
