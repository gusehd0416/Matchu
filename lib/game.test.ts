import { describe, expect, it } from 'vitest';
import { goToNextWord, isFinished, kstDate, msUntilNextPuzzle, newGame, puzzleFor, shareText, submitGuess, totalScore } from './game';

describe('game', () => {
  it('한국 시간 자정에 날짜가 바뀐다', () => {
    expect(kstDate(Date.parse('2026-10-19T14:59:00Z'))).toBe('2026-10-19');
    expect(kstDate(Date.parse('2026-10-19T15:00:00Z'))).toBe('2026-10-20');
    expect(msUntilNextPuzzle(Date.parse('2026-10-19T14:00:00Z'))).toBe(60 * 60 * 1000);
  });

  it('출시일이 1일차이고 100일 뒤 다시 1일차 단어가 나온다', () => {
    const first = puzzleFor('2026-10-19');
    expect(first.day).toBe(1);
    expect(first.answers).toHaveLength(5);
    expect(puzzleFor('2027-01-27').answers).toEqual(first.answers);
  });

  it('맞히면 solved, 6번 틀리면 failed, 점수는 남은 기회 기준', () => {
    let s = newGame('2026-10-19');
    s = submitGuess(s, '사과', '바다');
    s = submitGuess(s, '바다', '바다');
    expect(s.words[0].status).toBe('solved');
    expect(totalScore(s)).toBe(5);

    s = goToNextWord(s);
    for (let i = 0; i < 6; i++) s = submitGuess(s, '사과', '바다');
    expect(s.words[1].status).toBe('failed');
    expect(totalScore(s)).toBe(5);
    expect(isFinished(s)).toBe(false);
  });

  it('공유 문구에 정답이 들어가지 않는다', () => {
    const { answers } = puzzleFor('2026-10-19');
    let s = newGame('2026-10-19');
    for (let i = 0; i < 5; i++) {
      s = submitGuess(s, answers[i], answers[i]);
      s = goToNextWord(s);
    }
    const text = shareText(s, answers, 'https://playmatchu.com');
    expect(text).toContain('30/30 맞츄왕');
    for (const a of answers) expect(text).not.toContain(a);
  });
});
