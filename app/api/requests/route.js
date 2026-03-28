import { NextResponse } from 'next/server';
import { addRequest, getRequests, updateRequestStatus } from '../../../data/store';

export async function GET() {
  return NextResponse.json({ requests: getRequests() });
}

export async function POST(request) {
  const body = await request.json();
  const guest_name = String(body.guest_name || '').trim();
  const song_title = String(body.song_title || '').trim();
  const artist = String(body.artist || '').trim();

  if (!guest_name || !song_title || !artist) {
    return NextResponse.json({ error: 'Bitte alle Felder ausfüllen.' }, { status: 400 });
  }

  const item = addRequest({ guest_name, song_title, artist });
  return NextResponse.json({ request: item });
}

export async function PATCH(request) {
  const body = await request.json();
  updateRequestStatus(body.id, body.status);
  return NextResponse.json({ ok: true, requests: getRequests() });
}
