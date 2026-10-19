import { assemble } from 'es-hangul';

export const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const JUNGSEONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
export const JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const BASE = 0xac00;
const LAST = 0xd7a3;

/** 음절 하나를 [초성, 중성, 종성]으로 나눈다. 종성이 없으면 ''. 완성형 한글이 아니면 null. */
export function splitSyllable(ch: string): [string, string, string] | null {
  const code = ch.charCodeAt(0) - BASE;
  if (ch.length !== 1 || code < 0 || code > LAST - BASE) return null;
  return [CHOSEONG[Math.floor(code / 588)], JUNGSEONG[Math.floor((code % 588) / 28)], JONGSEONG[code % 28]];
}

export function isCompleteHangul(word: string): boolean {
  return [...word].every((ch) => splitSyllable(ch) !== null);
}

export function choseongOf(word: string): string {
  return [...word].map((ch) => splitSyllable(ch)?.[0] ?? ch).join('');
}

/** 화면 키보드로 누른 자모 목록을 글자로 조합한다. 예: ㄱㅏㄴㅏ → 가나 */
export function composeJamo(jamo: string[]): string {
  return jamo.length ? assemble(jamo) : '';
}
