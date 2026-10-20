'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { composeJamo, isCompleteHangul } from '../lib/hangul';
import { keyMarks, type Mark } from '../lib/judge';
import {
  MAX_TRIES,
  TOPIC_AFTER,
  CLUE_AFTER,
  WORDS_PER_DAY,
  applyGuess,
  goToNextWord,
  gradeOf,
  isFinished,
  kstDate,
  msUntilNextPuzzle,
  newGame,
  shareText,
  totalScore,
  wordScore,
  type GameState,
  type GuessResult,
  type PuzzleInfo,
} from '../lib/game';

// 도메인을 사기 전까지는 지금 열린 주소를 공유한다
const shareUrl = () => window.location.origin;

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

const ERRORS: Record<string, string> = {
  not_in_dictionary: '사전에 없는 단어예요',
  wrong_length: '글자 수가 맞지 않아요',
};

const PART_NAMES = ['초성', '중성', '종성'];
const MARK_NAMES: Record<Mark, string> = { correct: '맞음', present: '다른 글자에 있음', absent: '없음' };

function storageKey(date: string) {
  return `matchu:${date}`;
}

function loadGame(date: string): GameState {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(date)) ?? 'null') as GameState | null;
    // 예전 프로토타입 저장 형식(입력 단어만 저장)은 버린다.
    if (saved?.words?.every((w) => w.guesses.every((g) => typeof g === 'object' && 'result' in g))) return saved;
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
  const [puzzle, setPuzzle] = useState<PuzzleInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState<GameState>(() => newGame(date));
  const [jamo, setJamo] = useState<string[]>([]);
  const [shift, setShift] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState('');
  const [shake, setShake] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // 마지막 단어를 끝낸 직후에는 정답을 먼저 보여주고, 버튼을 눌러야 결과 화면으로 간다.
  const [holdResult, setHoldResult] = useState(false);

  // 퍼즐 정보(초성, 글자 수)는 서버에서, 진행 상황은 브라우저 저장소에서 읽는다.
  useEffect(() => {
    fetch(`/api/puzzle?date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPuzzle)
      .catch(() => setLoadError(true));
    setState(loadGame(date));
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
  const info = puzzle?.words[state.current];
  const length = info?.length ?? 0;
  const typed = composeJamo(jamo);
  const keys = useMemo(() => keyMarks(word.guesses.map((g) => g.result)), [word.guesses]);

  const fail = useCallback((message: string) => {
    setToast(message);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }, []);

  const submit = useCallback(async () => {
    if ([...typed].length !== length || !isCompleteHangul(typed)) return fail(`${length}글자 단어를 입력해 주세요`);
    setPending(true);
    try {
      const response = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, slot: state.current, guess: typed, attempt: word.guesses.length + 1 }),
      });
      const body = await response.json();
      if (!response.ok) return fail(ERRORS[body.error] ?? '잠시 후 다시 시도해 주세요');
      const next = applyGuess(state, body as GuessResult);
      if (isFinished(next)) setHoldResult(true);
      setState(next);
      setJamo([]);
    } catch {
      fail('인터넷 연결을 확인해 주세요');
    } finally {
      setPending(false);
    }
  }, [typed, length, date, state, word.guesses.length, fail]);

  const press = useCallback(
    (key: string) => {
      if (!puzzle || pending || word.status !== 'playing') return;
      if (key === 'ENTER') return void submit();
      if (key === 'BACK') return setJamo((j) => j.slice(0, -1));
      if (key === 'SHIFT') return setShift((v) => !v);
      setJamo((j) => ([...composeJamo([...j, key])].length > length ? j : [...j, key]));
      setShift(false);
    },
    [puzzle, pending, word.status, submit, length],
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

  if (loadError) {
    return (
      <main className="app">
        <Header day={null} onHelp={() => setShowHelp(true)} />
        <p className="note">오늘의 퍼즐을 불러오지 못했어요. 새로고침해 주세요.</p>
      </main>
    );
  }
  if (!puzzle || !info) {
    return (
      <main className="app">
        <Header day={null} onHelp={() => setShowHelp(true)} />
        <p className="note">오늘의 퍼즐을 불러오는 중이에요</p>
      </main>
    );
  }

  if (finished && !holdResult) return <Result state={state} day={puzzle.day} onToast={setToast} toast={toast} />;

  const emptyRows = MAX_TRIES - word.guesses.length - (word.status === 'playing' ? 1 : 0);

  return (
    <main className="app">
      <Header day={puzzle.day} onHelp={() => setShowHelp(true)} />
      <Progress state={state} />

      <section className="hint" aria-live="polite">
        <span className="hint-label">{state.current + 1}번째 단어 · {length}글자</span>
        <span className="hint-choseong">{info.choseong}</span>
        {word.topic && (
          <span className="hint-topic">
            주제 <strong>{word.topic}</strong>
          </span>
        )}
        {word.clue && <span className="hint-clue">{word.clue}</span>}
        {word.status === 'playing' && word.guesses.length > 0 && !word.clue && (
          <span className="hint-next">
            {word.topic
              ? `${CLUE_AFTER - word.guesses.length}번 더 틀리면 설명을 알려드려요`
              : `${TOPIC_AFTER - word.guesses.length}번 더 틀리면 주제를 알려드려요`}
          </span>
        )}
      </section>

      <section className="board" style={{ ['--cols' as string]: length }}>
        {word.guesses.map((guess, i) => (
          <Row key={i} guess={guess} />
        ))}
        {word.status === 'playing' && (
          <div className={`row current${shake ? ' shake' : ''}`}>
            {Array.from({ length }, (_, i) => (
              <div key={i} className={`tile${[...typed][i] ? ' filled' : ''}`}>
                <span className="syllable">{[...typed][i] ?? ''}</span>
              </div>
            ))}
            <div className="temp" />
          </div>
        )}
        {Array.from({ length: Math.max(emptyRows, 0) }, (_, i) => (
          <div key={`e${i}`} className="row">
            {Array.from({ length }, (_, j) => (
              <div key={j} className="tile" />
            ))}
            <div className="temp" />
          </div>
        ))}
      </section>

      {word.status !== 'playing' ? (
        <section className="word-done">
          <p>
            {word.status === 'solved' ? `${word.guesses.length}번 만에 맞혔어요!` : '아쉬워요. 정답은'}{' '}
            <strong>{word.answer}</strong>
          </p>
          <button className="primary" onClick={() => (finished ? setHoldResult(false) : setState((s) => goToNextWord(s)))}>
            {state.current + 1 < WORDS_PER_DAY ? '다음 단어' : '결과 보기'}
          </button>
        </section>
      ) : (
        <Keyboard marks={keys} shift={shift} onPress={press} />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}
    </main>
  );
}

function Header({ day, onHelp }: { day: number | null; onHelp: () => void }) {
  return (
    <header className="header">
      <h1>맞츄</h1>
      {day !== null && <span className="day">{day}일차</span>}
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

function Row({ guess }: { guess: GuessResult }) {
  const rank = guess.solved ? '정답' : guess.rank ? `${guess.rank}위` : '1000위 밖';
  return (
    <div className="row">
      {guess.result.map((s, i) => (
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
      <div className="temp judged" title="의미 온도: 뜻이 정답과 가까울수록 높아요">
        <strong>{guess.temperature}°</strong>
        <span>{rank}</span>
      </div>
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
  day,
  toast,
  onToast,
}: {
  state: GameState;
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
    const text = shareText(state, day, shareUrl());
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
              <span className="answer">{w.answer}</span>
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
        <Credits />
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
        <p>
          {TOPIC_AFTER}번 틀리면 정답의 <strong>주제</strong>를, {CLUE_AFTER}번 틀리면 <strong>한 줄 설명</strong>을 알려드려요.
        </p>
        <p>예: 정답이 지하철(ㅈㅎㅊ)일 때 기차역을 넣으면 ‘차’의 ㅊ은 노랑, ㅏ는 초록이에요.</p>
        <p>
          오른쪽 <strong>온도</strong>는 뜻이 정답과 얼마나 가까운지예요. 100°가 정답이고, 정답과 가까운 단어 1000위 안에 들면 순위가
          나와요. 사전에 있는 명사만 입력할 수 있어요.
        </p>
        <button className="primary" onClick={onClose}>
          시작하기
        </button>
        <Credits />
      </div>
    </div>
  );
}

/** CC BY-SA 데이터 출처 표기 */
function Credits() {
  return (
    <p className="credits">
      단어: 국립국어원 표준국어대사전(korean-noun) · 의미 온도: spaCy ko_core_news_lg · 모두 CC BY-SA 4.0
    </p>
  );
}
