import { NextResponse } from 'next/server';
import crypto from 'crypto';

const APP_URL = 'https://musik1-production.up.railway.app';
const REDIRECT_URI = `${APP_URL}/api/spotify/callback`;
const COOKIE_NAME = 'dj_spotify_pkce_verifier';

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID || '';
  const scopes = process.env.NEXT_PUBLIC_SPOTIFY_SCOPES || process.env.SPOTIFY_SCOPES || 'user-read-private playlist-read-private playlist-modify-public';

  if (!clientId) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SPOTIFY_CLIENT_ID fehlt bei Railway' }, { status: 500 });
  }

  const verifier = base64url(crypto.randomBytes(64));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

  const spotifyUrl = new URL('https://accounts.spotify.com/authorize');
  spotifyUrl.searchParams.set('response_type', 'code');
  spotifyUrl.searchParams.set('client_id', clientId);
  spotifyUrl.searchParams.set('scope', scopes);
  spotifyUrl.searchParams.set('code_challenge_method', 'S256');
  spotifyUrl.searchParams.set('code_challenge', challenge);
  spotifyUrl.searchParams.set('redirect_uri', REDIRECT_URI);

  const response = NextResponse.redirect(spotifyUrl.toString());
  response.cookies.set(COOKIE_NAME, verifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60
  });
  return response;
}
