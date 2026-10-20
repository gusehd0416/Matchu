import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// 정답과 사전은 서버에서만 읽는다. 클라이언트 번들에는 들어가지 않는다.
const DATA_DIR = path.join(process.cwd(), 'data');

let answers: string[] | undefined;
let schedule: number[][] | undefined;
let hints: Map<string, { topic: string; clue: string }> | undefined;
const words = new Map<number, { list: string[]; index: Map<string, number> }>();

function readCsv(file: string): string[][] {
  return readFileSync(path.join(DATA_DIR, file), 'utf8')
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(','));
}

/** 정답 후보 전체. 번호가 data/sim 파일 이름이다. */
export function answerList(): string[] {
  return (answers ??= readCsv('answer_candidates.csv').map(([word]) => word));
}

/** 날짜 순서대로, 하루 5개 정답의 번호 */
export function dailySchedule(): number[][] {
  if (!schedule) {
    const index = new Map(answerList().map((w, i) => [w, i]));
    schedule = [];
    for (const [day, , word] of readCsv('puzzles_100days.csv')) (schedule[Number(day) - 1] ??= []).push(index.get(word)!);
  }
  return schedule;
}

/** 정답별 주제와 한 줄 설명 (data/hints.csv) */
export function hintFor(word: string): { topic: string; clue: string } {
  hints ??= new Map(readCsv('hints.csv').map(([w, topic, clue]) => [w, { topic, clue }]));
  return hints.get(word)!;
}

/** 글자 수별 입력 허용 단어 */
export function wordsOfLength(length: number) {
  let entry = words.get(length);
  if (!entry) {
    const list = readFileSync(path.join(DATA_DIR, 'words', `${length}.txt`), 'utf8').trim().split('\n');
    entry = { list, index: new Map(list.map((w, i) => [w, i])) };
    words.set(length, entry);
  }
  return entry;
}
