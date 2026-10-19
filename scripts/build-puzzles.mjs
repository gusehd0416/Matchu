// data/puzzles_100days.csv -> lib/puzzles.json (프로토타입용, 정식 버전은 서버에서 판정)
import { readFileSync, writeFileSync } from 'node:fs';

const rows = readFileSync('data/puzzles_100days.csv', 'utf8').trim().split('\n').slice(1);
const days = [];
for (const row of rows) {
  const [day, , word] = row.split(',');
  (days[Number(day) - 1] ??= []).push(word);
}
writeFileSync('lib/puzzles.json', JSON.stringify(days) + '\n');
console.log(`${days.length}일치 퍼즐을 lib/puzzles.json에 썼습니다.`);
