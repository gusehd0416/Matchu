# 맞츄

매일 5개의 한글 단어를 초성 힌트로 맞히는 데일리 단어 게임입니다. Wordle식 자모 피드백과 꼬맨틀식 의미 유사도를 결합합니다.

## 지금 되는 것 (프로토타입)

- 오늘의 5단어 (한국 시간 자정 기준, `data/puzzles_100days.csv`의 100일치를 순환)
- 두벌식 화면 키보드 + 실제 키보드 입력, 자모 조합
- 초성·중성·종성별 색깔 판정 (`lib/judge.ts`)
- 단어당 6번 기회, 점수와 등급, 정답이 드러나지 않는 결과 공유
- 진행 상황 브라우저 저장

아직 없는 것: 사전 검사, 의미 온도(유사도), 서버 판정, 광고. 지금은 정답이 클라이언트 번들에 들어 있습니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 판정 로직 테스트
npm run data       # data/puzzles_100days.csv -> lib/puzzles.json
npm run demo       # 미리보기용 단일 HTML (dist/demo.html)
```

## 구조

- `lib/hangul.ts`: 음절 분해, 초성, 자모 조합
- `lib/judge.ts`: 자모 판정, 키보드 색
- `lib/game.ts`: 하루 퍼즐, 진행 상태, 점수, 공유 문구
- `components/Game.tsx`: 게임 화면
- `data/`: 정답 후보 500단어와 100일 배정표
