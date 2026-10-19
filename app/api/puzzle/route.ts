import { NextResponse } from 'next/server';
import { kstDate } from '../../../lib/game';
import { isPlayableDate, puzzleInfo } from '../../../server/puzzle';

/** 오늘(또는 어제) 퍼즐의 초성과 글자 수. 정답은 보내지 않는다. */
export function GET(request: Request) {
  const date = new URL(request.url).searchParams.get('date') ?? kstDate(Date.now());
  if (!isPlayableDate(date)) return NextResponse.json({ error: 'bad_date' }, { status: 400 });
  return NextResponse.json(puzzleInfo(date), { headers: { 'Cache-Control': 'no-store' } });
}
