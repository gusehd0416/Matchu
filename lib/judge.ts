import { splitSyllable } from './hangul';

export type Mark = 'correct' | 'present' | 'absent';

/** 음절 하나의 판정: 초성·중성·종성 자리마다 자모와 색. 종성이 없으면 jamo가 ''. */
export type SyllableResult = { char: string; jamo: [string, string, string]; marks: [Mark, Mark, Mark] };

/**
 * Wordle식 자모 판정.
 * - correct: 같은 음절, 같은 자리(초·중·종)에 있음
 * - present: 정답의 다른 음절, 같은 자리에 있음 (정답에 있는 개수만큼만)
 * - absent: 그 자리에는 없음
 * 빈 받침끼리는 correct, 빈 받침은 present가 되지 않는다.
 */
export function judge(guess: string, answer: string): SyllableResult[] {
  const g = [...guess].map((ch) => splitSyllable(ch)!);
  const a = [...answer].map((ch) => splitSyllable(ch)!);
  if (g.length !== a.length || g.some((s) => !s) || a.some((s) => !s)) {
    throw new Error('정답과 글자 수가 같은 완성형 한글만 판정할 수 있습니다.');
  }

  const marks: Mark[][] = g.map(() => ['absent', 'absent', 'absent']);
  for (let part = 0; part < 3; part++) {
    const left = new Map<string, number>();
    g.forEach((syl, i) => {
      if (syl[part] === a[i][part]) marks[i][part] = 'correct';
      else if (a[i][part]) left.set(a[i][part], (left.get(a[i][part]) ?? 0) + 1);
    });
    g.forEach((syl, i) => {
      const j = syl[part];
      if (marks[i][part] === 'correct' || !j) return;
      const n = left.get(j) ?? 0;
      if (n > 0) {
        marks[i][part] = 'present';
        left.set(j, n - 1);
      }
    });
  }

  return [...guess].map((char, i) => ({ char, jamo: g[i], marks: marks[i] as [Mark, Mark, Mark] }));
}

const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };

/** 키보드 색칠용: 자모마다 지금까지 받은 가장 좋은 판정. 겹자모(ㅘ, ㄺ)는 그대로 키로 쓴다. */
export function keyMarks(results: SyllableResult[][]): Record<string, Mark> {
  const best: Record<string, Mark> = {};
  for (const row of results)
    for (const syl of row)
      syl.jamo.forEach((j, p) => {
        if (j && (!best[j] || RANK[syl.marks[p]] > RANK[best[j]])) best[j] = syl.marks[p];
      });
  return best;
}
