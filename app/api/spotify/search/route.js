import { NextResponse } from 'next/server';

let cachedToken = null;

function getBasicAuth() {
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return null;
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

async function getClientCredentialsToken() {
  const now = Date.now();
  if (cachedToken?.access_token && cachedToken.expires_at > now + 30000) {
    return cachedToken.access_token;
  }

  const basic = getBasicAuth();
  if (!basic) {
    throw new Error('Spotify Suche nicht konfiguriert: SPOTIFY_CLIENT_SECRET fehlt in Railway Variables.');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store'
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `Spotify Token Fehler ${res.status}`);
  }

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 30) * 1000
  };
  return cachedToken.access_token;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();
    if (q.length < 3) {
      return NextResponse.json({ tracks: [] });
    }

    const token = await getClientCredentialsToken();
    const params = new URLSearchParams({ q, type: 'track', limit: '6', market: 'DE' });
    const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || `Spotify Suche Fehler ${res.status}` }, { status: res.status });
    }

    const tracks = (data.tracks?.items || [])
      .filter((track) => track?.uri?.startsWith('spotify:track:'))
      .map((track) => ({
        id: track.id,
        uri: track.uri,
        name: track.name,
        artist: track.artists?.map((artist) => artist.name).join(', ') || '',
        album: track.album?.name || '',
        image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
        spotifyUrl: track.external_urls?.spotify || '',
        previewUrl: track.preview_url || ''
      }));

    return NextResponse.json({ tracks });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Spotify Suche fehlgeschlagen' }, { status: 500 });
  }
}
