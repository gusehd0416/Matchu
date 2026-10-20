import 'server-only';
import { choseongOf } from '../lib/hangul';
import { judge } from '../lib/judge';
import { CLUE_AFTER, LAUNCH_DATE, MAX_TRIES, TOPIC_AFTER, kstDate, type GuessResult } from '../lib/game';
import { answerList, dailySchedule, hintFor, wordsOfLength } from './data';

const DAY = 24 * 60 * 60 * 1000;

/** 지금 열려 있는 날짜인지. 자정 직후 이어하기를 위해 어제까지 받는다. 미래 날짜는 막는다. */
export function isPlayableDate(date: string, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const today = kstDate(now);
  const yesterday = kstDate(now - DAY);
  return (date === today || date === yesterday) && date >= LAUNCH_DATE;
}

function answersFor(date: string): number[] {
  const offset = Math.round((Date.parse(date) - Date.parse(LAUNCH_DATE)) / DAY);
  const days = dailySchedule();
  return days[((offset % days.length) + days.length) % days.length];
}

export function puzzleInfo(date: string) {
  const day = Math.round((Date.parse(date) - Date.parse(LAUNCH_DATE)) / DAY) + 1;
  const words = answersFor(date).map((i) => {
    const answer = answerList()[i];
    return { length: [...answer].length, choseong: choseongOf(answer) };
  });
  return { date, day, words };
}

export type GuessError = 'bad_request' | 'wrong_length' | 'not_in_dictionary';

/**
 * 입력 하나를 판정한다. attempt는 이 입력이 몇 번째 시도인지(1부터).
 * 맞혔거나 마지막 기회였으면 정답을 함께 돌려준다.
 * 틀린 횟수가 쌓이면 주제(TOPIC_AFTER번)와 설명(CLUE_AFTER번)을 함께 돌려준다.
 */
export function checkGuess(date: string, slot: number, guess: string, attempt: number): GuessResult | { error: GuessError } {
  const slots = answersFor(date);
  if (!Number.isInteger(slot) || slot < 0 || slot >= slots.length) return { error: 'bad_request' };
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > MAX_TRIES) return { error: 'bad_request' };

  const answerIndex = slots[slot];
  const answer = answerList()[answerIndex];
  if ([...guess].length !== [...answer].length) return { error: 'wrong_length' };

  if (!wordsOfLength([...answer].length).index.has(guess)) return { error: 'not_in_dictionary' };

  const solved = guess === answer;
  const hint = hintFor(answer);
  return {
    word: guess,
    result: judge(guess, answer),
    solved,
    answer: solved || attempt >= MAX_TRIES ? answer : undefined,
    topic: !solved && attempt >= TOPIC_AFTER ? hint.topic : undefined,
    clue: !solved && attempt >= CLUE_AFTER ? hint.clue : undefined,
  };
}
