import 'server-only';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

// 정답과 사전은 서버에서만 읽는다. 클라이언트 번들에는 들어가지 않는다.
const DATA_DIR = path.join(process.cwd(), 'data');

let answers: string[] | undefined;
let schedule: number[][] | undefined;
const words = new Map<number, { list: string[]; index: Map<string, number> }>();
const similarity = new Map<number, { temps: Uint8Array; top: Uint32Array }>();

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

/** 정답 하나에 대한 온도(단어 번호 순)와 상위 1000위 단어 번호 */
export function similarityFor(answerIndex: number) {
  let entry = similarity.get(answerIndex);
  if (!entry) {
    const length = [...answerList()[answerIndex]].length;
    const count = wordsOfLength(length).list.length;
    const bytes = gunzipSync(readFileSync(path.join(DATA_DIR, 'sim', `${answerIndex}.bin.gz`)));
    const top = new Uint32Array(bytes.buffer.slice(bytes.byteOffset + count, bytes.byteOffset + bytes.length));
    entry = { temps: bytes.subarray(0, count), top };
    similarity.set(answerIndex, entry);
  }
  return entry;
}
