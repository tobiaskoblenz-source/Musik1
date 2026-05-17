import { NextResponse } from 'next/server';

const APP_URL = 'https://musik1-production.up.railway.app';

export async function GET(request) {
  const url = new URL(request.url);
  const target = new URL('/spotify/callback', APP_URL);

  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (error) {
    target.searchParams.set('error', error);
    return NextResponse.redirect(target);
  }

  if (!code) {
    target.searchParams.set('error', 'Kein Spotify Code erhalten');
    return NextResponse.redirect(target);
  }

  // Wichtig: Diese API-Route tauscht den Code NICHT mehr selbst.
  // Der Login wurde im Browser mit PKCE gestartet; der Code-Verifier liegt deshalb im localStorage.
  // Darum leiten wir den Code nur sauber zur Client-Callback-Seite weiter.
  target.searchParams.set('code', code);
  if (state) target.searchParams.set('state', state);

  return NextResponse.redirect(target);
}
