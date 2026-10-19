'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { choseongOf, composeJamo, isCompleteHangul } from '../lib/hangul';
import { judge, keyMarks, type Mark, type SyllableResult } from '../lib/judge';
import {
  MAX_TRIES,
  WORDS_PER_DAY,
  goToNextWord,
  gradeOf,
  isFinished,
  kstDate,
  msUntilNextPuzzle,
  newGame,
  puzzleFor,
  shareText,
  submitGuess,
  totalScore,
  wordScore,
  type GameState,
} from '../lib/game';

const SHARE_URL = 'https://playmatchu.com';

// 두벌식 배열. [기본, 쉬프트]
const KEY_ROWS: [string, string][][] = [
  [['ㅂ', 'ㅃ'], ['ㅈ', 'ㅉ'], ['ㄷ', 'ㄸ'], ['ㄱ', 'ㄲ'], ['ㅅ', 'ㅆ'], ['ㅛ', 'ㅛ'], ['ㅕ', 'ㅕ'], ['ㅑ', 'ㅑ'], ['ㅐ', 'ㅒ'], ['ㅔ', 'ㅖ']],
  [['ㅁ', 'ㅁ'], ['ㄴ', 'ㄴ'], ['ㅇ', 'ㅇ'], ['ㄹ', 'ㄹ'], ['ㅎ', 'ㅎ'], ['ㅗ', 'ㅗ'], ['ㅓ', 'ㅓ'], ['ㅏ', 'ㅏ'], ['ㅣ', 'ㅣ']],
  [['ㅋ', 'ㅋ'], ['ㅌ', 'ㅌ'], ['ㅊ', 'ㅊ'], ['ㅍ', 'ㅍ'], ['ㅠ', 'ㅠ'], ['ㅜ', 'ㅜ'], ['ㅡ', 'ㅡ']],
];

// 실제 키보드: 한/영 상태와 상관없이 키 위치(code)로 자모를 정한다.
const CODE_TO_KEY: Record<string, [string, string]> = {};
'QWERTYUIOP|ASDFGHJKL|ZXCVBNM'.split('|').forEach((row, r) =>
  [...row].forEach((letter, c) => (CODE_TO_KEY[`Key${letter}`] = KEY_ROWS[r][c])),
);

const PART_NAMES = ['초성', '중성', '종성'];
const MARK_NAMES: Record<Mark, string> = { correct: '맞음', present: '다른 글자에 있음', absent: '없음' };

function storageKey(date: string) {
  return `matchu:${date}`;
}

function loadGame(date: string): GameState {
  try {
    const saved = localStorage.getItem(storageKey(date));
    if (saved) return JSON.parse(saved) as GameState;
  } catch {}
  return newGame(date);
}

function saveGame(state: GameState) {
  try {
    localStorage.setItem(storageKey(state.date), JSON.stringify(state));
  } catch {}
}

function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export default function Game() {
  const [date] = useState(() => kstDate(Date.now()));
  const { day, answers } = useMemo(() => puzzleFor(date), [date]);
  const [state, setState] = useState<GameState>(() => newGame(date));
  const [jamo, setJamo] = useState<string[]>([]);
  const [shift, setShift] = useState(false);
  const [toast, setToast] = useState('');
  const [shake, setShake] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // 마지막 단어를 끝낸 직후에는 정답을 먼저 보여주고, 버튼을 눌러야 결과 화면으로 간다.
  const [holdResult, setHoldResult] = useState(false);

  // 저장된 진행 상황은 브라우저에서만 읽는다 (서버 렌더와 어긋나지 않게).
  useEffect(() => {
    const saved = loadGame(date);
    setState(saved);
    try {
      if (!localStorage.getItem('matchu:seen-help')) {
        setShowHelp(true);
        localStorage.setItem('matchu:seen-help', '1');
      }
    } catch {}
  }, [date]);

  useEffect(() => saveGame(state), [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const finished = isFinished(state);
  const word = state.words[state.current];
  const answer = answers[state.current];
  const length = [...answer].length;
  const typed = composeJamo(jamo);
  const results = useMemo(() => word.guesses.map((g) => judge(g, answer)), [word.guesses, answer]);
  const keys = useMemo(() => keyMarks(results), [results]);

  const fail = useCallback((message: string) => {
    setToast(message);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }, []);

  const press = useCallback(
    (key: string) => {
      if (word.status !== 'playing') return;
      if (key === 'ENTER') {
        if ([...typed].length !== length || !isCompleteHangul(typed)) return fail(`${length}글자 단어를 입력해 주세요`);
        const next = submitGuess(state, typed, answer);
        if (isFinished(next)) setHoldResult(true);
        setState(next);
        setJamo([]);
        return;
      }
      if (key === 'BACK') return setJamo((j) => j.slice(0, -1));
      if (key === 'SHIFT') return setShift((v) => !v);
      setJamo((j) => ([...composeJamo([...j, key])].length > length ? j : [...j, key]));
      setShift(false);
    },
    [finished, word.status, typed, length, answer, fail, state],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') press('ENTER');
      else if (e.key === 'Backspace') press('BACK');
      else if (CODE_TO_KEY[e.code]) press(CODE_TO_KEY[e.code][e.shiftKey ? 1 : 0]);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  if (finished && !holdResult) return <Result state={state} answers={answers} day={day} onToast={setToast} toast={toast} />;

  const emptyRows = MAX_TRIES - results.length - (word.status === 'playing' ? 1 : 0);

  return (
    <main className="app">
      <Header day={day} onHelp={() => setShowHelp(true)} />
      <Progress state={state} />

      <section className="hint" aria-live="polite">
        <span className="hint-label">{state.current + 1}번째 단어 · {length}글자</span>
        <span className="hint-choseong">{choseongOf(answer)}</span>
      </section>

      <section className="board" style={{ ['--cols' as string]: length }}>
        {results.map((row, i) => (
          <Row key={i} result={row} />
        ))}
        {word.status === 'playing' && (
          <div className={`row current${shake ? ' shake' : ''}`}>
            {Array.from({ length }, (_, i) => (
              <div key={i} className={`tile${[...typed][i] ? ' filled' : ''}`}>
                <span className="syllable">{[...typed][i] ?? ''}</span>
              </div>
            ))}
          </div>
        )}
        {Array.from({ length: Math.max(emptyRows, 0) }, (_, i) => (
          <div key={`e${i}`} className="row">
            {Array.from({ length }, (_, j) => (
              <div key={j} className="tile" />
            ))}
          </div>
        ))}
      </section>

      {word.status !== 'playing' ? (
        <section className="word-done">
          <p>
            {word.status === 'solved' ? `${word.guesses.length}번 만에 맞혔어요!` : '아쉬워요. 정답은'}{' '}
            <strong>{answer}</strong>
          </p>
          <button className="primary" onClick={() => (finished ? setHoldResult(false) : setState((s) => goToNextWord(s)))}>
            {state.current + 1 < WORDS_PER_DAY ? '다음 단어' : '결과 보기'}
          </button>
        </section>
      ) : (
        <Keyboard marks={keys} shift={shift} onPress={press} />
      )}

      <p className="note">프로토타입: 사전 검사와 의미 온도(꼬맨틀식 유사도)는 다음 단계에서 붙어요.</p>
      {toast && <div className="toast" role="status">{toast}</div>}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}
    </main>
  );
}

function Header({ day, onHelp }: { day: number; onHelp: () => void }) {
  return (
    <header className="header">
      <h1>맞츄</h1>
      <span className="day">{day}일차</span>
      <button className="icon" onClick={onHelp} aria-label="게임 방법">
        ?
      </button>
    </header>
  );
}

function Progress({ state }: { state: GameState }) {
  return (
    <ol className="progress" aria-label="오늘의 5단어 진행 상황">
      {state.words.map((w, i) => (
        <li key={i} className={`dot ${w.status}${i === state.current ? ' active' : ''}`}>
          {i + 1}
        </li>
      ))}
    </ol>
  );
}

function Row({ result }: { result: SyllableResult[] }) {
  return (
    <div className="row">
      {result.map((s, i) => (
        <div key={i} className={`tile judged${s.marks.every((m) => m === 'correct') ? ' all-correct' : ''}`}>
          <span className="syllable">{s.char}</span>
          <span className="jamo">
            {/* 받침이 없는 글자는 받침 칸을 그리지 않는다 (지 → ㅈ ㅣ) */}
            {s.jamo.map(
              (j, p) =>
                j && (
                  <span key={p} className={`j ${s.marks[p]}`} title={`${PART_NAMES[p]} ${j}: ${MARK_NAMES[s.marks[p]]}`}>
                    {j}
                  </span>
                ),
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function Keyboard({ marks, shift, onPress }: { marks: Record<string, Mark>; shift: boolean; onPress: (k: string) => void }) {
  return (
    <section className="keyboard" aria-label="한글 키보드">
      {KEY_ROWS.map((row, r) => (
        <div key={r} className="krow">
          {r === 2 && (
            <button className={`key wide${shift ? ' on' : ''}`} onClick={() => onPress('SHIFT')} aria-label="쌍자음">
              ⇧
            </button>
          )}
          {row.map(([base, shifted]) => {
            const k = shift ? shifted : base;
            return (
              <button key={base} className={`key ${marks[k] ?? ''}`} onClick={() => onPress(k)}>
                {k}
              </button>
            );
          })}
          {r === 2 && (
            <button className="key wide" onClick={() => onPress('BACK')} aria-label="지우기">
              ⌫
            </button>
          )}
        </div>
      ))}
      <button className="enter" onClick={() => onPress('ENTER')}>
        입력
      </button>
    </section>
  );
}

function Result({
  state,
  answers,
  day,
  toast,
  onToast,
}: {
  state: GameState;
  answers: string[];
  day: number;
  toast: string;
  onToast: (m: string) => void;
}) {
  const [left, setLeft] = useState(() => msUntilNextPuzzle(Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(msUntilNextPuzzle(Date.now())), 1000);
    return () => clearInterval(t);
  }, []);
  const score = totalScore(state);

  async function share() {
    const text = shareText(state, answers, SHARE_URL);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        onToast('결과를 복사했어요');
      }
    } catch {}
  }

  return (
    <main className="app">
      <Header day={day} onHelp={() => {}} />
      <section className="result">
        <p className="grade">{gradeOf(score)}</p>
        <p className="score">
          <strong>{score}</strong> / 30점
        </p>
        <ul className="answers">
          {state.words.map((w, i) => (
            <li key={i}>
              <span className="answer">{answers[i]}</span>
              <span className="meta">
                {w.status === 'solved' ? `${w.guesses.length}번 만에` : '실패'} · {wordScore(w)}점
              </span>
            </li>
          ))}
        </ul>
        <button className="primary" onClick={share}>
          결과 공유하기
        </button>
        <p className="countdown">
          다음 맞츄까지 <strong>{formatCountdown(left)}</strong>
        </p>
        <div className="ad-slot" aria-hidden="true">
          광고 자리 (결과 화면 하단 배너)
        </div>
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="게임 방법" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>맞츄 하는 법</h2>
        <p>매일 5개의 단어를 초성 힌트로 맞혀요. 단어마다 6번 기회가 있어요.</p>
        <p>입력하면 글자마다 초성·중성·종성 칸에 색이 나와요.</p>
        <ul className="legend">
          <li>
            <span className="j correct">ㅈ</span> 같은 글자, 같은 자리에 있어요
          </li>
          <li>
            <span className="j present">ㅊ</span> 정답의 다른 글자, 같은 자리에 있어요
          </li>
          <li>
            <span className="j absent">ㄱ</span> 그 자리에는 없어요
          </li>
        </ul>
        <p>예: 정답이 지하철(ㅈㅎㅊ)일 때 기차역을 넣으면 ‘차’의 ㅊ은 노랑, ㅏ는 초록이에요.</p>
        <button className="primary" onClick={onClose}>
          시작하기
        </button>
      </div>
    </div>
  );
}
