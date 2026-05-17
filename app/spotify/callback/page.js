'use client';

import { useEffect, useState } from 'react';

const TOKEN_KEY = 'dj_spotify_token';
const VERIFIER_KEY = 'dj_spotify_code_verifier';
const LOG_KEY = 'dj_wunsch_error_log';
const REDIRECT_KEY = 'dj_spotify_redirect_uri';

function addLog(area, message, type = 'info', details = '') {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: new Date().toLocaleString('de-DE'),
      area,
      message,
      type,
      details
    };
    localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...logs].slice(0, 80)));
  } catch {}
}

function getConfig() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const storedRedirect = typeof window !== 'undefined' ? localStorage.getItem(REDIRECT_KEY) : '';
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
  const cleanAppUrl = envAppUrl && !envAppUrl.includes('localhost') ? envAppUrl.replace(/\/$/, '') : '';
  const baseUrl = origin && !origin.includes('localhost') ? origin : cleanAppUrl;
  const runtimeRedirect = baseUrl ? `${baseUrl}/api/spotify/callback` : '';
  const redirectUri = storedRedirect && !storedRedirect.includes('localhost') ? storedRedirect : runtimeRedirect;

  return {
    clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
    redirectUri
  };
}

export default function SpotifyCallbackPage() {
  const [message, setMessage] = useState('Spotify Login wird verarbeitet ...');

  useEffect(() => {
    async function exchangeCode() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) throw new Error(`Spotify Login abgebrochen: ${error}`);
        if (!code) throw new Error('Kein Spotify Code in der Callback URL gefunden');

        const verifier = localStorage.getItem(VERIFIER_KEY);
        if (!verifier) throw new Error('Spotify Code Verifier fehlt. Bitte Login neu starten.');

        const config = getConfig();
        if (!config.clientId) throw new Error('NEXT_PUBLIC_SPOTIFY_CLIENT_ID fehlt');

        const body = new URLSearchParams({
          client_id: config.clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          code_verifier: verifier
        });

        const res = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error_description || data?.error || 'Spotify Token konnte nicht geholt werden');

        localStorage.setItem(TOKEN_KEY, JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: data.token_type,
          scope: data.scope,
          expires_in: data.expires_in,
          expires_at: Date.now() + Number(data.expires_in || 3600) * 1000
        }));
        localStorage.removeItem(VERIFIER_KEY);
        localStorage.removeItem(REDIRECT_KEY);
        addLog('Spotify Login', 'Spotify Login erfolgreich', 'info');
        setMessage('Spotify Login erfolgreich. Du wirst zurück zum Dashboard geleitet ...');
        setTimeout(() => { window.location.href = '/dashboard'; }, 900);
      } catch (error) {
        addLog('Spotify Login', error.message || 'Spotify Login fehlgeschlagen', 'error');
        setMessage(`Spotify Fehler: ${error.message || 'Login fehlgeschlagen'}`);
      }
    }

    exchangeCode();
  }, []);

  return (
    <main className="guest-page">
      <div className="guest-wrap">
        <div className="panel guest-card">
          <h1 className="guest-title">Spotify</h1>
          <p className="guest-sub">{message}</p>
          <div style={{ marginTop: 18 }}>
            <a className="btn btn-secondary" href="/dashboard">Zurück zum Dashboard</a>
          </div>
        </div>
      </div>
    </main>
  );
}
