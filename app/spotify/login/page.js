'use client';

import { useEffect, useState } from 'react';

const APP_URL = 'https://musik1-production.up.railway.app';
const REDIRECT_URI = `${APP_URL}/api/spotify/callback`;
const VERIFIER_KEY = 'dj_spotify_code_verifier';
const REDIRECT_KEY = 'dj_spotify_redirect_uri';
const LOG_KEY = 'dj_wunsch_error_log';

function addLog(area, message, type = 'info', details = '') {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    const entry = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, time: new Date().toLocaleString('de-DE'), area, message, type, details };
    localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...logs].slice(0, 80)));
  } catch {}
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomVerifier(length = 96) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, v => chars[v % chars.length]).join('');
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data);
}

export default function SpotifyLoginPage() {
  const [message, setMessage] = useState('Spotify Login wird vorbereitet ...');

  useEffect(() => {
    async function start() {
      try {
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
        const scopes = process.env.NEXT_PUBLIC_SPOTIFY_SCOPES || 'user-read-private playlist-read-private playlist-modify-public playlist-modify-private';
        if (!clientId) throw new Error('NEXT_PUBLIC_SPOTIFY_CLIENT_ID fehlt bei Railway');

        const verifier = randomVerifier();
        const challenge = base64UrlEncode(await sha256(verifier));
        localStorage.setItem(VERIFIER_KEY, verifier);
        localStorage.setItem(REDIRECT_KEY, REDIRECT_URI);

        const spotifyUrl = new URL('https://accounts.spotify.com/authorize');
        spotifyUrl.searchParams.set('response_type', 'code');
        spotifyUrl.searchParams.set('client_id', clientId);
        spotifyUrl.searchParams.set('scope', scopes);
        spotifyUrl.searchParams.set('code_challenge_method', 'S256');
        spotifyUrl.searchParams.set('code_challenge', challenge);
        spotifyUrl.searchParams.set('redirect_uri', REDIRECT_URI);

        addLog('Spotify Login', `Client-Login v4 gestartet: ${REDIRECT_URI}`, 'info');
        setMessage('Weiterleitung zu Spotify ...');
        window.location.replace(spotifyUrl.toString());
      } catch (error) {
        addLog('Spotify Login', error.message || 'Spotify Login fehlgeschlagen', 'error');
        setMessage(`Spotify Fehler: ${error.message || 'Login fehlgeschlagen'}`);
      }
    }
    start();
  }, []);

  return (
    <main className="guest-page">
      <div className="guest-wrap">
        <div className="panel guest-card">
          <h1 className="guest-title">Spotify Login</h1>
          <p className="guest-sub">{message}</p>
          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>Redirect: {REDIRECT_URI}</p>
          <div style={{ marginTop: 18 }}>
            <a className="btn btn-secondary" href="/dashboard">Zurück zum Dashboard</a>
          </div>
        </div>
      </div>
    </main>
  );
}
