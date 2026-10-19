"""사전과 의미 온도 데이터를 만든다.

입력
- korean-noun 패키지의 표준국어대사전 명사 목록 (CC BY-SA 4.0)
- spaCy ko_core_news_lg 단어 벡터 (CC BY-SA 4.0)
- data/answer_candidates.csv

출력
- data/words/{2,3,4}.txt : 입력 허용 단어 (글자 수별, 가나다순)
- data/sim/{정답 번호}.bin.gz : 정답 하나에 대한 같은 글자 수 단어 전체의 온도와 상위 1000위
    [uint8 × 단어 수] 온도 0~100 (코사인 유사도 × 100, 0 미만은 0)
    [uint32 × 1000] 유사도 순위 1~1000위 단어 번호 (정답 자신은 0위로 빼고 1위부터)

실행 방법은 scripts/similarity/README.md 참고.
"""
import csv
import gzip
import json
import re
import sys
from pathlib import Path

import numpy as np
import spacy

ROOT = Path(__file__).resolve().parents[2]
NOUN_DATA = Path(sys.argv[1])  # korean-noun/dist/data 디렉터리
TOP_N = 1000
HANGUL = re.compile(r'^[가-힣]{2,4}$')


def load_nouns() -> list[str]:
    words = []
    for name in ['t10', 't25', 't50', 't100']:
        text = (NOUN_DATA / f'{name}.js').read_text()
        body = text[text.index('`') + 1 : text.rindex('`')]
        words += [line.split('\t')[0] for line in body.strip().split('\n')]
    return words


def main() -> None:
    answers = [row['word'] for row in csv.DictReader(open(ROOT / 'data/answer_candidates.csv'))]
    words = sorted({w for w in load_nouns() if HANGUL.match(w)} | set(answers))
    by_len = {n: [w for w in words if len(w) == n] for n in (2, 3, 4)}

    (ROOT / 'data/words').mkdir(exist_ok=True)
    for n, ws in by_len.items():
        (ROOT / f'data/words/{n}.txt').write_text('\n'.join(ws) + '\n')
        print(f'{n}글자 {len(ws)}개')

    nlp = spacy.load('ko_core_news_lg')
    vectors = {}
    for n, ws in by_len.items():
        v = np.array([nlp.vocab[w].vector for w in ws], dtype=np.float32)
        vectors[n] = v / (np.linalg.norm(v, axis=1, keepdims=True) + 1e-9)

    out = ROOT / 'data/sim'
    out.mkdir(exist_ok=True)
    for i, answer in enumerate(answers):
        n = len(answer)
        index = by_len[n].index(answer)
        sims = vectors[n] @ vectors[n][index]
        temps = np.clip(np.rint(sims * 100), 0, 100).astype(np.uint8)
        temps[index] = 100
        order = np.argsort(-sims)
        top = np.array([j for j in order if j != index][:TOP_N], dtype='<u4')
        (out / f'{i}.bin.gz').write_bytes(gzip.compress(temps.tobytes() + top.tobytes(), mtime=0))

    print(f'정답 {len(answers)}개 온도 파일을 data/sim에 썼습니다.')


if __name__ == '__main__':
    main()
