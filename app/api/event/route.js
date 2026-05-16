import { NextResponse } from 'next/server';
import { getEvent, updateEvent } from '../../../lib/store';

export async function GET() {
  return NextResponse.json({ event: getEvent() });
}

export async function PATCH(request) {
  const body = await request.json();
  const event = updateEvent(body || {});
  return NextResponse.json({ event });
}
