import { describe, expect, it } from 'vitest';
import { applyGuess, goToNextWord, isFinished, kstDate, msUntilNextPuzzle, newGame, shareText, totalScore, type GuessResult } from './game';
import { judge } from './judge';

const guess = (word: string, answer: string): GuessResult => ({
  word,
  result: judge(word, answer),
  solved: word === answer,
  answer: word === answer ? answer : undefined,
});

describe('game', () => {
  it('한국 시간 자정에 날짜가 바뀐다', () => {
    expect(kstDate(Date.parse('2026-10-19T14:59:00Z'))).toBe('2026-10-19');
    expect(kstDate(Date.parse('2026-10-19T15:00:00Z'))).toBe('2026-10-20');
    expect(msUntilNextPuzzle(Date.parse('2026-10-19T14:00:00Z'))).toBe(60 * 60 * 1000);
  });

  it('맞히면 solved, 6번 틀리면 failed, 점수는 남은 기회 기준', () => {
    let s = newGame('2026-10-19');
    s = applyGuess(s, guess('사과', '바다'));
    s = applyGuess(s, guess('바다', '바다'));
    expect(s.words[0].status).toBe('solved');
    expect(s.words[0].answer).toBe('바다');
    expect(totalScore(s)).toBe(5);

    s = goToNextWord(s);
    for (let i = 0; i < 6; i++) s = applyGuess(s, guess('사과', '바다'));
    expect(s.words[1].status).toBe('failed');
    expect(totalScore(s)).toBe(5);
    expect(isFinished(s)).toBe(false);
  });

  it('공유 문구에 정답이 들어가지 않는다', () => {
    const answers = ['바다', '하늘', '지하철', '고양이', '작심삼일'];
    let s = newGame('2026-10-19');
    for (const a of answers) s = goToNextWord(applyGuess(s, guess(a, a)));
    const text = shareText(s, 1, 'https://playmatchu.com');
    expect(text).toContain('맞츄 1일차 30/30 맞츄왕');
    for (const a of answers) expect(text).not.toContain(a);
  });
});
