# 사전·의미 온도 데이터 만들기

`data/words`와 `data/sim`은 이 스크립트로 만든 결과물입니다. 정답 후보(`data/answer_candidates.csv`)를 바꾸면 다시 돌리세요.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install spacy
pip install https://github.com/explosion/spacy-models/releases/download/ko_core_news_lg-3.8.0/ko_core_news_lg-3.8.0-py3-none-any.whl
npm pack korean-noun@0.2.1 && tar xzf korean-noun-0.2.1.tgz
python scripts/similarity/build.py package/dist/data
```

## 데이터 출처

- 단어 목록: [korean-noun](https://www.npmjs.com/package/korean-noun) 0.2.1, 국립국어원 표준국어대사전 명사 표제어를 한국어 위키백과 빈도로 거른 목록 (CC BY-SA 4.0)
- 단어 벡터: [spaCy ko_core_news_lg](https://spacy.io/models/ko) 3.8.0 (CC BY-SA 4.0)

두 데이터 모두 CC BY-SA 4.0이므로, 서비스 화면에 출처를 표기하고 이 데이터로 만든 `data/words`, `data/sim`도 같은 조건으로 공개해야 합니다.
