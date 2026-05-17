'use client';

import { useEffect, useMemo, useState } from 'react';

const LOG_KEY = 'dj_wunsch_error_log';
const TOKEN_KEY = 'dj_spotify_token';
const VERIFIER_KEY = 'dj_spotify_code_verifier';
const PLAYLIST_KEY = 'dj_spotify_public_playlist';
const REDIRECT_KEY = 'dj_spotify_redirect_uri';
const BUILD_VERSION = 'spotify-server-login-fix-2026-05-17-v3';

function badgeClass(status) {
  if (status === 'open') return 'badge badge-live';
  if (status === 'accepted') return 'badge badge-accepted';
  if (status === 'played') return 'badge badge-played';
  return 'badge badge-rejected';
}

function requestClass(status) {
  if (status === 'open') return 'request-card live';
  if (status === 'accepted') return 'request-card accepted';
  if (status === 'played') return 'request-card played';
  return 'request-card rejected';
}

function statusLabel(status) {
  if (status === 'open') return 'LIVE / OFFEN';
  if (status === 'accepted') return 'ANGENOMMEN';
  if (status === 'played') return 'GESPIELT';
  return 'ABGELEHNT';
}

function getSpotifyConfig() {
  // Fester Railway-Redirect, damit Spotify niemals wieder localhost:8080 bekommt.
  const redirectUri = 'https://musik1-production.up.railway.app/api/spotify/callback';

  return {
    clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
    redirectUri,
    scopes: process.env.NEXT_PUBLIC_SPOTIFY_SCOPES || 'user-read-private playlist-read-private playlist-modify-public'
  };
}

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw);
    if (!token?.access_token) return null;
    return token;
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  return Boolean(token?.access_token && token?.expires_at && Date.now() < token.expires_at - 30000);
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function randomString(length = 96) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (x) => chars[x % chars.length]).join('');
}

async function createCodeChallenge(verifier) {
  return base64UrlEncode(await sha256(verifier));
}

export default function DashboardClient({ initialRequests = [], initialEvent }) {
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [eventName, setEventName] = useState(initialEvent?.name || 'TANZ');
  const [eventCode, setEventCode] = useState(initialEvent?.code || 'TANZ');
  const [guestPageStatus, setGuestPageStatus] = useState(initialEvent?.isActive ? 'EIN' : 'AUS');
  const [activePage, setActivePage] = useState('dashboard');
  const [logs, setLogs] = useState([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [spotifyBusy, setSpotifyBusy] = useState(false);

  useEffect(() => {
    try {
      setLogs(JSON.parse(localStorage.getItem(LOG_KEY) || '[]'));
      const savedPlaylist = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || 'null');
      if (savedPlaylist?.id) setSelectedPlaylistId(savedPlaylist.id);
    } catch {}
    refreshSpotifyStatus(false);
  }, []);

  useEffect(() => {
    let stopped = false;

    async function loadRequests() {
      try {
        const res = await fetch('/api/requests', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Requests konnten nicht geladen werden');
        if (!stopped && data.requests) setRequests(data.requests);
      } catch (error) {
        addLog('Wünsche laden', error.message || 'Unbekannter Fehler', 'error');
      }
    }

    async function loadEvent() {
      try {
        const res = await fetch('/api/event', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Event konnte nicht geladen werden');
        if (!stopped && data.event) {
          setEventName(data.event.name);
          setEventCode(data.event.code);
          setGuestPageStatus(data.event.isActive ? 'EIN' : 'AUS');
        }
      } catch (error) {
        addLog('Gäste-Seite laden', error.message || 'Unbekannter Fehler', 'error');
      }
    }

    loadRequests();
    loadEvent();

    const interval = setInterval(() => {
      loadRequests();
      loadEvent();
    }, 1200);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => ({
    total: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
    played: requests.filter((r) => r.status === 'played').length
  }), [requests]);

  const filtered = useMemo(() => {
    return requests
      .filter((r) => (filter === 'all' ? true : r.status === filter))
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [r.song_title, r.artist, r.guest_name].some((v) => String(v || '').toLowerCase().includes(q));
      });
  }, [requests, search, filter]);

  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId);

  function persistLogs(nextLogs) {
    setLogs(nextLogs);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(nextLogs)); } catch {}
  }

  function addLog(area, message, type = 'info', details = '') {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: new Date().toLocaleString('de-DE'),
      area,
      message,
      type,
      details
    };
    setLogs((prev) => {
      const next = [entry, ...prev].slice(0, 80);
      try { localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function clearLogs() {
    persistLogs([]);
    flash('Fehler-Log gelöscht');
  }

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 1800);
  }

  async function onStatusChange(id, status) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error('Status konnte nicht gespeichert werden');
    } catch (error) {
      addLog('Wunsch-Status', error.message || 'Status-Fehler', 'error', `ID: ${id}, Status: ${status}`);
      flash('Status speichern fehlgeschlagen');
    }
  }

  async function onDelete(id) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch('/api/requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Wunsch konnte nicht gelöscht werden');
      flash('Wunsch entfernt');
    } catch (error) {
      addLog('Wunsch löschen', error.message || 'Entfernen fehlgeschlagen', 'error', `ID: ${id}`);
      flash('Entfernen fehlgeschlagen');
    }
  }

  async function saveEvent(nextStatus = guestPageStatus, nextName = eventName, nextCode = eventCode) {
    try {
      const res = await fetch('/api/event', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName,
          code: nextCode,
          isActive: nextStatus === 'EIN'
        })
      });
      if (!res.ok) throw new Error('Event konnte nicht gespeichert werden');
      flash(`Gäste-Seite: ${nextStatus}`);
    } catch (error) {
      addLog('Gäste-Seite speichern', error.message || 'Speichern fehlgeschlagen', 'error');
      flash('Speichern fehlgeschlagen');
    }
  }

  function toggleGuestPage() {
    const nextStatus = guestPageStatus === 'EIN' ? 'AUS' : 'EIN';
    setGuestPageStatus(nextStatus);
    saveEvent(nextStatus, eventName, eventCode);
  }

  async function spotifyLogin() {
    try {
      // Server-Login erzwingt die richtige Railway Redirect URI und kann nicht mehr auf localhost fallen.
      localStorage.removeItem(VERIFIER_KEY);
      localStorage.removeItem(REDIRECT_KEY);
      addLog('Spotify Login', 'Weiterleitung über /api/spotify/login gestartet', 'info');
      window.location.href = '/api/spotify/login';
    } catch (error) {
      addLog('Spotify Login', error.message || 'Login fehlgeschlagen', 'error');
      flash('Spotify Login fehlgeschlagen');
      setActivePage('errors');
    }
  }

  function spotifyLogout() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(VERIFIER_KEY);
      setSpotifyConnected(false);
      setSpotifyUser(null);
      setPlaylists([]);
      addLog('Spotify Logout', 'Spotify wurde getrennt', 'info');
      flash('Spotify getrennt');
    } catch (error) {
      addLog('Spotify Logout', error.message || 'Logout fehlgeschlagen', 'error');
    }
  }

  async function spotifyFetch(url, options = {}) {
    const token = getStoredToken();
    if (!isTokenValid(token)) {
      setSpotifyConnected(false);
      throw new Error('Kein gültiger Spotify Login vorhanden');
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Spotify Fehler ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  async function refreshSpotifyStatus(showFlash = true) {
    try {
      const token = getStoredToken();
      const connected = isTokenValid(token);
      setSpotifyConnected(connected);
      if (!connected) {
        setSpotifyUser(null);
        setPlaylists([]);
        if (showFlash) flash('Spotify nicht verbunden');
        return;
      }

      const me = await spotifyFetch('https://api.spotify.com/v1/me');
      setSpotifyUser(me);
      setSpotifyConnected(true);
      await loadSpotifyPlaylists(false);
      if (showFlash) flash('Spotify Verbindung OK');
    } catch (error) {
      setSpotifyConnected(false);
      setSpotifyUser(null);
      addLog('Spotify Verbindungstest', error.message || 'Verbindung fehlgeschlagen', 'error');
      if (showFlash) flash('Spotify Verbindung fehlgeschlagen');
    }
  }

  async function loadSpotifyPlaylists(showFlash = true) {
    try {
      const data = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=50');
      const publicLists = (data.items || []).filter((playlist) => playlist.public === true);
      setPlaylists(publicLists);

      const saved = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || 'null');
      const nextSelected = publicLists.find((p) => p.id === saved?.id)?.id || publicLists[0]?.id || '';
      setSelectedPlaylistId(nextSelected);
      if (nextSelected) {
        const playlist = publicLists.find((p) => p.id === nextSelected);
        localStorage.setItem(PLAYLIST_KEY, JSON.stringify({ id: playlist.id, name: playlist.name }));
      }

      if (showFlash) flash(`${publicLists.length} öffentliche Playlists geladen`);
      addLog('Spotify Playlists', `${publicLists.length} öffentliche Playlists geladen`, 'info');
    } catch (error) {
      addLog('Spotify Playlists', error.message || 'Playlists konnten nicht geladen werden', 'error');
      if (showFlash) flash('Playlists laden fehlgeschlagen');
    }
  }

  function onPlaylistSelect(id) {
    setSelectedPlaylistId(id);
    const playlist = playlists.find((p) => p.id === id);
    if (playlist) {
      localStorage.setItem(PLAYLIST_KEY, JSON.stringify({ id: playlist.id, name: playlist.name }));
      addLog('Spotify Playlist', `Playlist gewählt: ${playlist.name}`, 'info');
    }
  }

  function buildQuery(item) {
    return `${item.song_title || ''} ${item.artist || ''}`.trim();
  }

  async function findSpotifyTrack(item) {
    const query = buildQuery(item);
    if (!query) throw new Error('Song oder Artist fehlt');
    const params = new URLSearchParams({ q: query, type: 'track', limit: '1' });
    const data = await spotifyFetch(`https://api.spotify.com/v1/search?${params.toString()}`);
    const track = data?.tracks?.items?.[0];
    if (!track) throw new Error(`Kein Spotify Treffer gefunden: ${query}`);
    return track;
  }

  async function openInSpotify(item) {
    try {
      setSpotifyBusy(true);
      const track = await findSpotifyTrack(item);
      window.open(track.external_urls.spotify, '_blank', 'noopener,noreferrer');
      addLog('Spotify öffnen', `Geöffnet: ${track.name} - ${track.artists?.map((a) => a.name).join(', ')}`, 'info');
    } catch (error) {
      addLog('Spotify öffnen', error.message || 'Spotify öffnen fehlgeschlagen', 'error', buildQuery(item));
      flash('Spotify öffnen fehlgeschlagen');
      setActivePage('errors');
    } finally {
      setSpotifyBusy(false);
    }
  }

  async function addToSpotifyPlaylist(item) {
    try {
      setSpotifyBusy(true);
      if (!selectedPlaylistId) throw new Error('Bitte erst eine öffentliche Playlist auswählen');
      const track = await findSpotifyTrack(item);
      await spotifyFetch(`https://api.spotify.com/v1/playlists/${selectedPlaylistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris: [track.uri] })
      });
      const playlistName = playlists.find((p) => p.id === selectedPlaylistId)?.name || 'ausgewählte Playlist';
      addLog('Spotify Playlist', `Hinzugefügt: ${track.name} → ${playlistName}`, 'info', buildQuery(item));
      flash('Zur Spotify Playlist hinzugefügt');
    } catch (error) {
      addLog('Spotify Playlist', error.message || 'Hinzufügen fehlgeschlagen', 'error', buildQuery(item));
      flash('Playlist hinzufügen fehlgeschlagen');
      setActivePage('errors');
    } finally {
      setSpotifyBusy(false);
    }
  }

  function spotifyDebugText() {
    const config = getSpotifyConfig();
    const token = getStoredToken();
    return {
      clientId: config.clientId ? 'Vorhanden' : 'FEHLT',
      redirectUri: config.redirectUri || 'FEHLT',
      scopes: config.scopes,
      token: isTokenValid(token) ? 'Gültig' : token?.access_token ? 'Abgelaufen' : 'Nicht vorhanden'
    };
  }

  const debug = spotifyDebugText();

  return (
    <main className="page-shell">
      <div className="topbar">
        <div className="topbar-left">
          <div className="logo-box">🎧</div>
          <div>
            <h1 className="page-title">DJ Dashboard + Spotify</h1>
            <div className="notice">Version: {BUILD_VERSION}</div>
            <p className="page-subtitle">{eventName}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => setActivePage('dashboard')}>Dashboard</button>
          <button className="btn btn-secondary" onClick={() => setActivePage('spotify')}>Spotify</button>
          <button className="btn btn-secondary" onClick={() => setActivePage('errors')}>Fehler-Log</button>
          <button className="btn btn-primary" onClick={spotifyLogin}>Spotify Login v3</button>
          <button className="btn btn-secondary" onClick={spotifyLogout}>Spotify Logout</button>
        </div>
      </div>

      {notice ? <div className="notice">{notice}</div> : null}

      {activePage === 'spotify' ? (
        <div className="dashboard-grid">
          <div className="stack">
            <div className="panel panel-pad">
              <div className="section-head">
                <h2 className="section-title">Spotify Seite</h2>
                <span className={spotifyConnected ? 'badge badge-played' : 'badge badge-rejected'}>{spotifyConnected ? 'Verbunden' : 'Nicht verbunden'}</span>
              </div>

              <div className="info-list">
                <div className="info-row"><span>Login Status</span><span>{spotifyConnected ? 'Verbunden' : 'Nicht verbunden'}</span></div>
                <div className="info-row"><span>Spotify Nutzer</span><span>{spotifyUser?.display_name || spotifyUser?.id || '-'}</span></div>
                <div className="info-row"><span>Token</span><span>{debug.token}</span></div>
                <div className="info-row"><span>Client ID</span><span>{debug.clientId}</span></div>
                <div className="info-row"><span>Build Version</span><span>{BUILD_VERSION}</span></div>
                <div className="info-row"><span>Redirect URI</span><span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{debug.redirectUri}</span></div>
                <div className="info-row"><span>Scopes</span><span style={{ textAlign: 'right' }}>{debug.scopes}</span></div>
              </div>

              <div className="filter-row" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={spotifyLogin}>Spotify Login</button>
                <button className="btn btn-secondary" onClick={spotifyLogout}>Spotify Logout</button>
                <button className="btn btn-secondary" onClick={() => refreshSpotifyStatus(true)}>Verbindung testen</button>
                <button className="btn btn-secondary" onClick={() => loadSpotifyPlaylists(true)}>Playlists neu laden</button>
              </div>
            </div>

            <div className="panel panel-pad">
              <div className="section-head">
                <h2 className="section-title">Öffentliche Playlist</h2>
                <span className="badge badge-soft">nur public</span>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="label">Playlist auswählen</label>
                <select className="input" value={selectedPlaylistId} onChange={(e) => onPlaylistSelect(e.target.value)}>
                  <option value="">Keine Playlist gewählt</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
                  ))}
                </select>
              </div>

              <div className="info-list">
                <div className="info-row"><span>Ausgewählt</span><span>{selectedPlaylist?.name || '-'}</span></div>
                <div className="info-row"><span>Geladene öffentliche Playlists</span><span>{playlists.length}</span></div>
                <div className="info-row"><span>Hinzufügen</span><span>{selectedPlaylistId ? 'Bereit' : 'Playlist fehlt'}</span></div>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="panel panel-pad">
              <h2 className="section-title">Spotify Fehler</h2>
              <div className="info-list">
                {logs.filter((log) => log.area.toLowerCase().includes('spotify')).slice(0, 8).map((log) => (
                  <div className="info-row" key={log.id} style={{ alignItems: 'flex-start' }}>
                    <span style={{ color: log.type === 'error' ? '#fecaca' : '#d1fae5' }}>{log.area}<br /><small>{log.time}</small></span>
                    <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{log.message}</span>
                  </div>
                ))}
                {logs.filter((log) => log.area.toLowerCase().includes('spotify')).length === 0 ? <div className="info-row"><span>Keine Spotify Meldungen</span><span>OK</span></div> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activePage === 'errors' ? (
        <div className="panel panel-pad">
          <div className="section-head">
            <h2 className="section-title">Fehler-Log</h2>
            <button className="btn btn-secondary" onClick={clearLogs}>Log löschen</button>
          </div>
          <div className="info-list">
            {logs.map((log) => (
              <div className="info-row" key={log.id} style={{ alignItems: 'flex-start' }}>
                <span style={{ minWidth: 170 }}>
                  <b style={{ color: log.type === 'error' ? '#fecaca' : '#d1fae5' }}>{log.area}</b><br />
                  <small>{log.time}</small><br />
                  <small>{log.type === 'error' ? 'Fehler' : 'Info'}</small>
                </span>
                <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>
                  {log.message}
                  {log.details ? <><br /><small>{log.details}</small></> : null}
                </span>
              </div>
            ))}
            {logs.length === 0 ? <div className="info-row"><span>Keine Fehler gespeichert</span><span>OK</span></div> : null}
          </div>
        </div>
      ) : null}

      {activePage === 'dashboard' ? (
        <>
          <div className="stats-grid">
            <div className="panel panel-pad"><div className="stat-label">Gesamt</div><div className="stat-value">{stats.total}</div><div className="stat-sub">alle Wünsche</div></div>
            <div className="panel panel-pad"><div className="stat-label">Offen</div><div className="stat-value">{stats.open}</div><div className="stat-sub">neu eingegangen</div></div>
            <div className="panel panel-pad"><div className="stat-label">Angenommen</div><div className="stat-value">{stats.accepted}</div><div className="stat-sub">für später</div></div>
            <div className="panel panel-pad"><div className="stat-label">Gespielt</div><div className="stat-value">{stats.played}</div><div className="stat-sub">schon durch</div></div>
          </div>

          <div className="dashboard-grid">
            <div className="stack">
              <div className="panel panel-pad">
                <div className="section-head">
                  <h2 className="section-title">Event bearbeiten</h2>
                  <span className="badge badge-soft">Spotify ergänzt</span>
                </div>

                <div className="field-grid">
                  <div className="full">
                    <label className="label">Eventname</label>
                    <input className="input" value={eventName} onChange={(e) => setEventName(e.target.value)} onBlur={() => saveEvent(guestPageStatus, eventName, eventCode)} />
                  </div>
                  <div>
                    <label className="label">Event-Code</label>
                    <input className="input" value={eventCode} onChange={(e) => setEventCode(e.target.value.toUpperCase())} onBlur={() => saveEvent(guestPageStatus, eventName, eventCode)} />
                  </div>
                  <div>
                    <label className="label">Gäste-Seite</label>
                    <input className="input" value={guestPageStatus} readOnly />
                  </div>
                </div>
              </div>

              <div className="panel panel-pad">
                <div className="toolbar">
                  <input className="input" placeholder="Suche nach Song, Artist oder Gast" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <div className="filter-row">
                    <button className="btn btn-secondary" onClick={() => setFilter('all')}>Alle</button>
                    <button className="btn btn-secondary" onClick={() => setFilter('open')}>Offen</button>
                    <button className="btn btn-secondary" onClick={() => setFilter('accepted')}>Angenommen</button>
                    <button className="btn btn-secondary" onClick={() => setFilter('played')}>Gespielt</button>
                    <button className="btn btn-secondary" onClick={() => setFilter('rejected')}>Abgelehnt</button>
                  </div>
                </div>
              </div>

              <div className="request-list">
                {filtered.map((item) => (
                  <div key={item.id} className={requestClass(item.status)}>
                    <div className="request-head">
                      <div>
                        <div>
                          <h3 className="request-title" style={{ display: 'inline-block', marginRight: 8 }}>{item.song_title}</h3>
                          <span className={badgeClass(item.status)}>{statusLabel(item.status)}</span>
                        </div>
                        <div className="request-meta">{item.artist}</div>
                        <div className="request-submeta">von {item.guest_name} · {item.created_at}</div>
                        <div className="request-submeta" style={{ marginTop: 12, color: spotifyConnected ? 'rgba(110,231,183,.9)' : 'rgba(252,165,165,.9)' }}>
                          Spotify: {spotifyConnected ? `verbunden${selectedPlaylist ? ` · Playlist: ${selectedPlaylist.name}` : ''}` : 'nicht verbunden'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="request-id">#{item.id}</div>
                        <button className="btn btn-secondary" onClick={() => onDelete(item.id)} style={{ width: 38, minWidth: 38, height: 38, padding: 0, borderRadius: 14 }} aria-label="Wunsch entfernen" title="Wunsch entfernen">×</button>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button className="btn btn-secondary" onClick={() => onStatusChange(item.id, 'accepted')}>Annehmen</button>
                      <button className="btn btn-secondary" onClick={() => onStatusChange(item.id, 'played')}>Gespielt</button>
                      <button className="btn btn-secondary" disabled={spotifyBusy} onClick={() => addToSpotifyPlaylist(item)}>Zu Spotify</button>
                      <button className="btn btn-secondary" disabled={spotifyBusy} onClick={() => openInSpotify(item)}>Spotify öffnen</button>
                      <button className="btn btn-secondary" disabled={spotifyBusy} onClick={() => addToSpotifyPlaylist(item)}>+ Zur Spotify Playlist</button>
                      <button className="btn btn-ghost" onClick={() => onStatusChange(item.id, 'open')}>Zurück auf offen</button>
                      <button className="btn btn-ghost" onClick={() => onStatusChange(item.id, 'rejected')}>Ablehnen</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="stack">
              <div className="panel panel-pad">
                <div className="section-head">
                  <h2 className="section-title">Event Übersicht</h2>
                  <span className="badge badge-soft">{guestPageStatus}</span>
                </div>

                <div className="info-list">
                  <div className="info-row"><span>Event-Code</span><span>{eventCode}</span></div>
                  <div className="info-row"><span>Gäste-Seite</span><span>{guestPageStatus}</span></div>
                  <div className="info-row"><span>Anzeige</span><span>{guestPageStatus === 'EIN' ? 'Formular sichtbar' : 'Geschlossen-Seite sichtbar'}</span></div>
                </div>
              </div>

              <div className="panel panel-pad">
                <h2 className="section-title">Gäste-Seite</h2>

                <div className="info-list" style={{ marginTop: 16 }}>
                  <div className="info-row"><span>Status</span><span>{guestPageStatus}</span></div>
                  <div className="info-row"><span>QR-Code</span><span>Fest</span></div>
                  <div className="info-row"><span>Seite</span><span>{guestPageStatus === 'EIN' ? 'Wunschformular' : 'Geschlossen'}</span></div>
                </div>

                <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                  <button className="btn btn-secondary btn-block" onClick={toggleGuestPage}>
                    {guestPageStatus === 'EIN' ? 'Gäste-Seite ausschalten' : 'Gäste-Seite einschalten'}
                  </button>
                </div>
              </div>

              <div className="panel panel-pad">
                <h2 className="section-title">Spotify</h2>

                <div className="info-list" style={{ marginTop: 16 }}>
                  <div className="info-row"><span>Status</span><span>{spotifyConnected ? 'Verbunden' : 'Nicht verbunden'}</span></div>
                  <div className="info-row"><span>Playlist</span><span>{selectedPlaylist?.name || 'Keine gewählt'}</span></div>
                  <div className="info-row"><span>Modus</span><span>Nur öffentliche Playlist</span></div>
                </div>

                <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                  <button className="btn btn-primary btn-block" onClick={spotifyLogin}>Spotify Login</button>
                  <button className="btn btn-secondary btn-block" onClick={spotifyLogout}>Spotify Logout</button>
                  <button className="btn btn-secondary btn-block" onClick={() => setActivePage('spotify')}>Spotify-Seite öffnen</button>
                  <button className="btn btn-secondary btn-block" onClick={() => setActivePage('errors')}>Fehler-Log öffnen</button>
                </div>
              </div>

              <div className="panel panel-pad">
                <h2 className="section-title">Playlist Vorschau</h2>

                <div className="info-list" style={{ marginTop: 16 }}>
                  {playlists.slice(0, 4).map((playlist, index) => (
                    <div className="info-row" key={playlist.id}><span>{index + 1}</span><span>{playlist.name}</span></div>
                  ))}
                  {playlists.length === 0 ? <div className="info-row"><span>Keine Playlists geladen</span><span>-</span></div> : null}
                </div>

                <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                  <button className="btn btn-secondary btn-block" onClick={() => loadSpotifyPlaylists(true)}>Öffentliche Playlists laden</button>
                </div>
              </div>

              <div className="panel panel-pad">
                <h2 className="section-title">Letzte Spotify Meldungen</h2>

                <div className="info-list" style={{ marginTop: 16 }}>
                  {logs.filter((log) => log.area.toLowerCase().includes('spotify')).slice(0, 3).map((log) => (
                    <div className="info-row" key={log.id} style={{ alignItems: 'flex-start' }}>
                      <span>{log.area}<br /><small>{log.time}</small></span>
                      <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{log.message}</span>
                    </div>
                  ))}
                  {logs.filter((log) => log.area.toLowerCase().includes('spotify')).length === 0 ? <div className="info-row"><span>Keine Meldungen</span><span>OK</span></div> : null}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
