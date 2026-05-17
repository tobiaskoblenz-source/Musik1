import { NextResponse } from 'next/server';

const APP_URL = 'https://musik1-production.up.railway.app';
const REDIRECT_URI = `${APP_URL}/api/spotify/callback`;
const COOKIE_NAME = 'dj_spotify_pkce_verifier';

function encodeTokenPayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export async function GET(request) {
  const url = new URL(request.url);
  const target = new URL('/spotify/callback', url.origin);
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');

  if (error) {
    target.searchParams.set('error', error);
    return NextResponse.redirect(target);
  }

  if (!code) {
    target.searchParams.set('error', 'Kein Spotify Code erhalten');
    return NextResponse.redirect(target);
  }

  const verifier = request.cookies.get(COOKIE_NAME)?.value;
  if (!verifier) {
    target.searchParams.set('error', 'Spotify Code Verifier Cookie fehlt. Bitte Login neu starten.');
    return NextResponse.redirect(target);
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID || '';
  if (!clientId) {
    target.searchParams.set('error', 'NEXT_PUBLIC_SPOTIFY_CLIENT_ID fehlt bei Railway');
    return NextResponse.redirect(target);
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier
    });

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(data?.error_description || data?.error || 'Spotify Token konnte nicht geholt werden');
    }

    target.searchParams.set('spotify_token', encodeTokenPayload({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      scope: data.scope,
      expires_in: data.expires_in,
      expires_at: Date.now() + Number(data.expires_in || 3600) * 1000
    }));

    const response = NextResponse.redirect(target);
    response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    target.searchParams.set('error', err?.message || 'Spotify Callback Fehler');
    const response = NextResponse.redirect(target);
    response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  }
}
