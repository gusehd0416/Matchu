import { NextResponse } from 'next/server';
import { checkGuess, isPlayableDate } from '../../../server/puzzle';

/** 입력 하나를 판정한다. body: { date, slot, guess, attempt } */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { date, slot, guess, attempt } = body ?? {};
  if (typeof date !== 'string' || !isPlayableDate(date) || typeof guess !== 'string') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const result = checkGuess(date, slot, guess, attempt);
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 });
}
