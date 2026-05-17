import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    buildVersion: 'spotify-scope-private-permission-fix-2026-05-17-v9',
    redirectUri: 'https://musik1-production.up.railway.app/api/spotify/callback',
    appUrl: process.env.APP_URL || '',
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || '',
    hasClientId: Boolean(process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID),
    scopes: process.env.NEXT_PUBLIC_SPOTIFY_SCOPES || 'user-read-private playlist-read-private playlist-modify-public playlist-modify-private',
    loginApi: '/api/spotify/login',
    loginApiAlt: '/api/spotify-login',
    loginPage: '/spotify/login',
    note: 'v8: Playlist-Hinzufügen nutzt den neuen Spotify /playlists/{id}/items Endpunkt statt /tracks.'
  });
}
