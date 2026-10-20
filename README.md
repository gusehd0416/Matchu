# 맞츄

매일 5개의 한글 단어를 초성 힌트로 맞히는 데일리 단어 게임입니다. Wordle식 자모 피드백과 꼬맨틀식 의미 유사도를 결합합니다.

## 지금 되는 것

- 오늘의 5단어 (한국 시간 자정 기준, `data/puzzles_100days.csv`의 100일치를 순환)
- 두벌식 화면 키보드 + 실제 키보드 입력, 자모 조합
- 초성·중성·종성별 색깔 판정 (`lib/judge.ts`)
- 사전 검사: 표준국어대사전 명사 약 9만 4천 개 (2~4글자)
- 힌트: 3번 틀리면 주제, 5번 틀리면 한 줄 설명 (`data/hints.csv`)
- 서버 판정: 정답은 서버에만 있고, 맞히거나 6번을 다 쓰면 그때 공개
- 단어당 6번 기회, 점수와 등급, 정답이 드러나지 않는 결과 공유
- 진행 상황 브라우저 저장

아직 없는 것: 광고, 로그인, 통계.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 판정·서버 로직 테스트
```

## API

- `GET /api/puzzle?date=YYYY-MM-DD`: 그날 5단어의 초성과 글자 수 (정답 없음). 오늘과 어제만 열림
- `POST /api/guess` `{ date, slot, guess, attempt }`: 자모 판정, 단계별 주제·설명 힌트. 맞혔거나 `attempt`가 6이면 정답 포함

## 구조

- `lib/hangul.ts`: 음절 분해, 초성, 자모 조합
- `lib/judge.ts`: 자모 판정, 키보드 색
- `lib/game.ts`: 진행 상태, 점수, 공유 문구 (브라우저용, 정답 없음)
- `server/`: 정답·사전·힌트 데이터 읽기와 판정 (서버 전용)
- `app/api/`: 퍼즐 정보와 판정 API
- `components/Game.tsx`: 게임 화면

## 데이터

- `data/answer_candidates.csv`, `data/puzzles_100days.csv`: 정답 후보 500개와 100일 배정표
- `data/words/`: 입력 허용 사전. 만드는 법과 출처(CC BY-SA 4.0)는 `scripts/similarity/README.md`
