import { describe, expect, it } from 'vitest';
import { answerList, dailySchedule, hintFor, wordsOfLength } from './data';
import { checkGuess, isPlayableDate, puzzleInfo } from './puzzle';

const NOW = Date.parse('2026-10-19T03:00:00Z'); // 한국 시간 2026-10-19 12:00

describe('puzzle', () => {
  it('오늘과 어제만 열리고 미래 날짜는 막는다', () => {
    expect(isPlayableDate('2026-10-19', NOW)).toBe(true);
    expect(isPlayableDate('2026-10-20', NOW)).toBe(false);
    expect(isPlayableDate('2026-10-18', NOW)).toBe(false); // 출시 전
    expect(isPlayableDate('2026-10-19; drop', NOW)).toBe(false);
  });

  it('퍼즐 정보에는 초성과 글자 수만 있다', () => {
    const info = puzzleInfo('2026-10-19');
    expect(info.day).toBe(1);
    expect(info.words).toHaveLength(5);
    const answers = dailySchedule()[0].map((i) => answerList()[i]);
    expect(JSON.stringify(info)).not.toContain(answers[0]);
    expect(info.words[0]).toEqual({ length: [...answers[0]].length, choseong: expect.any(String) });
  });

  it('정답 후보는 모두 입력 가능한 단어다', () => {
    for (const a of answerList()) expect(wordsOfLength([...a].length).index.has(a)).toBe(true);
  });

  it('정답마다 주제와 설명이 있고 설명에 정답 글자가 없다', () => {
    for (const a of answerList()) {
      const { topic, clue } = hintFor(a);
      expect(topic, a).toBeTruthy();
      for (const ch of a) expect(clue, a).not.toContain(ch);
    }
  });

  it('판정: 사전 검사, 힌트와 정답 공개 시점', () => {
    const answer = answerList()[dailySchedule()[0][0]];
    expect(checkGuess('2026-10-19', 0, '뷁'.repeat([...answer].length), 1)).toEqual({ error: 'not_in_dictionary' });
    expect(checkGuess('2026-10-19', 0, '가나다라마', 1)).toEqual({ error: 'wrong_length' });
    expect(checkGuess('2026-10-19', 9, answer, 1)).toEqual({ error: 'bad_request' });

    const other = wordsOfLength([...answer].length).list.find((w) => w !== answer)!;
    const miss = checkGuess('2026-10-19', 0, other, 1);
    expect('error' in miss).toBe(false);
    if ('error' in miss) return;
    expect(miss.solved).toBe(false);
    expect(miss.answer).toBeUndefined();

    const last = checkGuess('2026-10-19', 0, other, 6);
    expect('error' in last ? null : last.answer).toBe(answer);

    expect(miss.topic).toBeUndefined();
    const third = checkGuess('2026-10-19', 0, other, 3);
    expect('error' in third ? null : [typeof third.topic, third.clue]).toEqual(['string', undefined]);
    const fifth = checkGuess('2026-10-19', 0, other, 5);
    expect('error' in fifth ? null : typeof fifth.clue).toBe('string');

    const hit = checkGuess('2026-10-19', 0, answer, 2);
    expect(hit).toMatchObject({ solved: true, answer });
  });
});
