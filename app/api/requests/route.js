import { NextResponse } from 'next/server';
import { addRequest, deleteRequest, getRequests, updateRequestStatus } from '../../../lib/store';

export async function GET() {
  return NextResponse.json({ requests: getRequests() });
}

export async function POST(request) {
  const body = await request.json();
  const guest_name = String(body.guest_name || '').trim();
  const song_title = String(body.song_title || '').trim();
  const artist = String(body.artist || '').trim();
  const spotify_track_id = String(body.spotify_track_id || '').trim();
  const spotify_track_uri = String(body.spotify_track_uri || '').trim();
  const spotify_url = String(body.spotify_url || '').trim();
  const spotify_image = String(body.spotify_image || '').trim();
  const spotify_album = String(body.spotify_album || '').trim();

  if (!guest_name || !song_title || !artist) {
    return NextResponse.json({ error: 'Bitte alle Felder ausfüllen.' }, { status: 400 });
  }

  const item = addRequest({ guest_name, song_title, artist, spotify_track_id, spotify_track_uri, spotify_url, spotify_image, spotify_album });
  return NextResponse.json({ request: item });
}

export async function PATCH(request) {
  const body = await request.json();
  updateRequestStatus(body.id, body.status);
  return NextResponse.json({ ok: true, requests: getRequests() });
}

export async function DELETE(request) {
  const body = await request.json();
  deleteRequest(body.id);
  return NextResponse.json({ ok: true, requests: getRequests() });
}
