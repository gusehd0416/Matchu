import { describe, expect, it } from 'vitest';
import { choseongOf, composeJamo, splitSyllable } from './hangul';
import { judge, keyMarks } from './judge';

const marksOf = (guess: string, answer: string) => judge(guess, answer).map((s) => s.marks.join(','));

describe('hangul', () => {
  it('음절을 초·중·종성으로 나눈다', () => {
    expect(splitSyllable('철')).toEqual(['ㅊ', 'ㅓ', 'ㄹ']);
    expect(splitSyllable('하')).toEqual(['ㅎ', 'ㅏ', '']);
    expect(splitSyllable('a')).toBeNull();
  });

  it('초성을 뽑는다', () => {
    expect(choseongOf('지하철')).toBe('ㅈㅎㅊ');
  });

  it('키보드 자모를 글자로 조합한다', () => {
    expect(composeJamo(['ㅈ', 'ㅣ', 'ㅎ', 'ㅏ', 'ㅊ', 'ㅓ', 'ㄹ'])).toBe('지하철');
    expect(composeJamo(['ㄱ', 'ㅗ', 'ㅏ', 'ㅇ'])).toBe('광');
    expect(composeJamo([])).toBe('');
  });
});

describe('judge', () => {
  it('정답이면 모두 correct', () => {
    expect(marksOf('지하철', '지하철')).toEqual(Array(3).fill('correct,correct,correct'));
  });

  it('PRD 예시: 기차역 → 지하철', () => {
    expect(marksOf('기차역', '지하철')).toEqual([
      'absent,correct,correct', // ㄱ 없음, ㅣ 자리 맞음, 받침 없음끼리 맞음
      'present,correct,correct', // ㅊ은 3번째 음절 초성, ㅏ 맞음
      'absent,absent,absent', // ㅇ ㅕ ㄱ 없음
    ]);
  });

  it('같은 자모가 여러 번이면 정답에 있는 개수만큼만 present', () => {
    // 정답 바다, 입력 다바 → 초성이 서로 자리만 바뀜
    expect(marksOf('다바', '바다')).toEqual(['present,correct,correct', 'present,correct,correct']);
    // 정답 사과(ㅅㅏ / ㄱㅘ), 입력 가가: ㄱ은 두 번째에서 이미 맞았으니 첫 ㄱ은 absent
    expect(marksOf('가가', '사과')).toEqual(['absent,correct,correct', 'correct,absent,correct']);
    // 정답 바다: 초성 ㅂ,ㄷ. 입력 다다 → 두 번째 ㄷ은 correct, 첫 ㄷ은 남은 ㄷ이 없어 absent
    expect(marksOf('다다', '바다')).toEqual(['absent,correct,correct', 'correct,correct,correct']);
  });

  it('빈 받침은 present가 되지 않는다', () => {
    // 정답 하늘(받침 '', ㄹ), 입력 늘하(받침 ㄹ, ''): ㄹ은 present, 빈 받침은 absent
    const [first, second] = judge('늘하', '하늘');
    expect(first.marks[2]).toBe('present');
    expect(second.marks[2]).toBe('absent');
  });

  it('글자 수가 다르면 오류', () => {
    expect(() => judge('사과', '지하철')).toThrow();
  });
});

describe('keyMarks', () => {
  it('자모마다 가장 좋은 판정을 남긴다', () => {
    const marks = keyMarks([judge('기차역', '지하철'), judge('지하철', '지하철')]);
    expect(marks['ㅈ']).toBe('correct');
    expect(marks['ㅊ']).toBe('correct');
    expect(marks['ㄱ']).toBe('absent');
  });
});
