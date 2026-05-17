import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    buildVersion: 'guest-spotify-search-2026-05-17-v13',
    redirectUri: 'https://musik1-production.up.railway.app/api/spotify/callback',
    appUrl: process.env.APP_URL || '',
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || '',
    hasClientId: Boolean(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID),
    hasClientSecret: Boolean(process.env.SPOTIFY_CLIENT_SECRET),
    scopes: process.env.NEXT_PUBLIC_SPOTIFY_SCOPES || 'user-read-private playlist-read-private playlist-modify-public playlist-modify-private',
    loginApi: '/api/spotify/login',
    loginApiAlt: '/api/spotify-login',
    loginPage: '/spotify/login',
    note: 'v13: Gäste-Seite mit Spotify-Suche, Auswahl, Cover und gespeicherter Track-URI. Spotify Login/Playlist bleibt erhalten.'
  });
}
