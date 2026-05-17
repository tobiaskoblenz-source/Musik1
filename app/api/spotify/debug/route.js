import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    buildVersion: 'guest-queue-nowplaying-closedtext-2026-05-17-v14',
    redirectUri: 'https://musik1-production.up.railway.app/api/spotify/callback',
    appUrl: process.env.APP_URL || '',
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || '',
    hasClientId: Boolean(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID),
    hasClientSecret: Boolean(process.env.SPOTIFY_CLIENT_SECRET),
    scopes: process.env.NEXT_PUBLIC_SPOTIFY_SCOPES || 'user-read-private playlist-read-private playlist-modify-public playlist-modify-private',
    loginApi: '/api/spotify/login',
    loginApiAlt: '/api/spotify-login',
    loginPage: '/spotify/login',
    note: 'v14: Gäste-Seite mit Sperrtext-Auswahl, Warteliste, Jetzt-läuft-Anzeige und automatisch sortiertem Dashboard. Spotify Login/Playlist bleibt erhalten.'
  });
}
