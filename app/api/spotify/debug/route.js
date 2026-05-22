import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
railway-node20-npm-fix-2026-05-22-v29',
    redirectUri: 'https://musik1-production.up.railway.app/api/spotify/callback',
    appUrl: process.env.APP_URL || '',
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || '',
    hasClientId: Boolean(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID),
    hasClientSecret: Boolean(process.env.SPOTIFY_CLIENT_SECRET),
    scopes: process.env.NEXT_PUBLIC_SPOTIFY_SCOPES || 'user-read-private playlist-read-private playlist-modify-public playlist-modify-private',
    loginApi: '/api/spotify/login',
    loginApiAlt: '/api/spotify-login',
    loginPage: '/spotify/login',
    note: 'v27: Kompaktmodus zeigt nur Wunschliste; Suche, Filter und wichtige Einstellungen liegen im Kompakt-Menue.'
  });
}
