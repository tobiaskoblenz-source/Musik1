import { NextResponse } from 'next/server';
import { getEvent, updateEvent } from '../../../data/store';

export async function GET() {
  return NextResponse.json({ event: getEvent() });
}

export async function PATCH(request) {
  const body = await request.json();
  const next = updateEvent(body || {});
  return NextResponse.json({ event: next });
}
