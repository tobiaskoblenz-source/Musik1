'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const LOG_KEY = 'dj_wunsch_error_log';
const TOKEN_KEY = 'dj_spotify_token';
const VERIFIER_KEY = 'dj_spotify_code_verifier';
const PLAYLIST_KEY = 'dj_spotify_public_playlist';
const REDIRECT_KEY = 'dj_spotify_redirect_uri';
const BUILD_VERSION = 'settings-page-clean-dashboard-2026-05-17-v21';

const CLOSED_MESSAGE_PRESETS = [
  'Heute keine Musikwünsche mehr. Danke fürs Feiern!',
  'Wünsche sind kurz pausiert. Der DJ ist gleich wieder bereit.',
  'Der DJ sortiert gerade die Musikwünsche. Gleich geht es weiter.',
  'Musikwünsche sind aktuell geschlossen. Danke für eure Wünsche!'
];

const STATUS_SORT_ORDER = { open: 0, accepted: 1, rejected: 2, played: 3 };
function badgeClass(status) {
  if (status === 'open') return 'badge badge-live';
  if (status === 'accepted') return 'badge badge-accepted';
  if (status === 'played') return 'badge badge-played';
  return 'badge badge-rejected';
}

function requestClass(status, compact = false) {
  const base = compact ? 'request-card compact' : 'request-card';
  if (status === 'open') return `${base} live`;
  if (status === 'accepted') return `${base} accepted`;
  if (status === 'played') return `${base} played`;
  return `${base} rejected`;
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
    scopes: process.env.NEXT_PUBLIC_SPOTIFY_SCOPES || 'user-read-private playlist-read-private playlist-modify-public playlist-modify-private'
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

function getTokenScopes(token = getStoredToken()) {
  return String(token?.scope || '').split(/\s+/).filter(Boolean);
}

function hasSpotifyScope(scope) {
  return getTokenScopes().includes(scope);
}

function getMissingSpotifyScopes(token = getStoredToken()) {
  const scopes = getTokenScopes(token);
  const required = ['playlist-modify-public', 'playlist-modify-private'];
  return required.filter((scope) => !scopes.includes(scope));
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
  const [compactMode, setCompactMode] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [notice, setNotice] = useState('');
  const [eventName, setEventName] = useState(initialEvent?.name || 'TANZ');
  const [eventCode, setEventCode] = useState(initialEvent?.code || 'TANZ');
  const [guestPageStatus, setGuestPageStatus] = useState(initialEvent?.isActive ? 'EIN' : 'AUS');
  const [closedMessage, setClosedMessage] = useState(initialEvent?.closedMessage || CLOSED_MESSAGE_PRESETS[1]);
  const [showGuestQueue, setShowGuestQueue] = useState(initialEvent?.showGuestQueue !== false);
  const [showNowPlaying, setShowNowPlaying] = useState(initialEvent?.showNowPlaying !== false);
  const [activePage, setActivePage] = useState('dashboard');
  const [logs, setLogs] = useState([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [spotifyBusy, setSpotifyBusy] = useState(false);
  const [djMode, setDjMode] = useState(false);
  const [autoPlaylist, setAutoPlaylist] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [playedBottomEnabled, setPlayedBottomEnabled] = useState(true);
  const [spotifyInfoEnhanced, setSpotifyInfoEnhanced] = useState(true);
  const knownRequestIdsRef = useRef(new Set(initialRequests.map((r) => String(r.id))));
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    try {
      setLogs(JSON.parse(localStorage.getItem(LOG_KEY) || '[]'));
      const savedPlaylist = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || 'null');
      if (savedPlaylist?.id) setSelectedPlaylistId(savedPlaylist.id);
      setAutoPlaylist(localStorage.getItem('dj_auto_playlist') === 'true');
      const savedSound = localStorage.getItem('dj_new_request_sound') === 'true';
      setSoundEnabled(savedSound);
      soundEnabledRef.current = savedSound;
      setPlayedBottomEnabled(localStorage.getItem('dj_played_bottom_enabled') !== 'false');
      setSpotifyInfoEnhanced(localStorage.getItem('dj_spotify_info_enhanced') !== 'false');
    } catch {}
    refreshSpotifyStatus(false);
  }, []);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    try { localStorage.setItem('dj_new_request_sound', String(soundEnabled)); } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    try { localStorage.setItem('dj_auto_playlist', String(autoPlaylist)); } catch {}
  }, [autoPlaylist]);


  useEffect(() => {
    try { localStorage.setItem('dj_played_bottom_enabled', String(playedBottomEnabled)); } catch {}
  }, [playedBottomEnabled]);


  useEffect(() => {
    try { localStorage.setItem('dj_spotify_info_enhanced', String(spotifyInfoEnhanced)); } catch {}
  }, [spotifyInfoEnhanced]);

  useEffect(() => {
    let stopped = false;

    async function loadRequests() {
      try {
        const res = await fetch('/api/requests', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Requests konnten nicht geladen werden');
        if (!stopped && data.requests) {
          const incomingIds = new Set(data.requests.map((r) => String(r.id)));
          const newRequests = data.requests.filter((r) => !knownRequestIdsRef.current.has(String(r.id)));
          knownRequestIdsRef.current = incomingIds;
          if (newRequests.length && soundEnabledRef.current) {
            playNewRequestSound();
            flash(`${newRequests.length} neuer Musikwunsch${newRequests.length > 1 ? 'e' : ''} eingegangen`);
          }
          setRequests(data.requests);
        }
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
          setClosedMessage(data.event.closedMessage || CLOSED_MESSAGE_PRESETS[1]);
          setShowGuestQueue(data.event.showGuestQueue !== false);
          setShowNowPlaying(data.event.showNowPlaying !== false);
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
    played: requests.filter((r) => r.status === 'played').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    spotify: requests.filter((r) => r.spotify_track_uri || r.spotify_url).length
  }), [requests]);

  const filtered = useMemo(() => {
    return [...requests]
      .filter((r) => {
        if (hideDone && (r.status === 'played' || r.status === 'rejected')) return false;
        if (filter === 'all') return true;
        if (filter === 'spotify') return Boolean(r.spotify_track_uri || r.spotify_url);
        return r.status === filter;
      })
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [r.song_title, r.artist, r.guest_name].some((v) => String(v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (playedBottomEnabled) {
          const statusDiff = (STATUS_SORT_ORDER[a.status] ?? 9) - (STATUS_SORT_ORDER[b.status] ?? 9);
          if (statusDiff !== 0) return statusDiff;
        }
        return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
      });
  }, [requests, search, filter, playedBottomEnabled]);

  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId);
  const filterButtons = [
    ['all', 'Alle', stats.total],
    ['open', 'Offen', stats.open],
    ['accepted', 'Angenommen', stats.accepted],
    ['played', 'Gespielt', stats.played],
    ['rejected', 'Abgelehnt', stats.rejected],
    ['spotify', 'Spotify gefunden', stats.spotify]
  ];
  const nowPlaying = useMemo(() => requests.find((r) => r.status === 'played') || null, [requests]);

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

  function playNewRequestSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {}
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playNewRequestSound();
      flash('Signalton für neue Wünsche ist EIN');
      addLog('Benachrichtigung', 'Signalton für neue Wünsche aktiviert', 'info');
    } else {
      flash('Signalton für neue Wünsche ist AUS');
      addLog('Benachrichtigung', 'Signalton für neue Wünsche deaktiviert', 'info');
    }
  }

  function toggleDjMode() {
    const next = !djMode;
    setDjMode(next);
    if (next) {
      try { document.documentElement.requestFullscreen?.(); } catch {}
      setCompactMode(false);
      flash('DJ-Modus gestartet');
    } else {
      try { document.exitFullscreen?.(); } catch {}
      flash('DJ-Modus beendet');
    }
  }

  function csvEscape(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function downloadTextFile(filename, text, mime = 'text/plain;charset=utf-8') {
    try {
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      addLog('Export', error.message || 'Export fehlgeschlagen', 'error');
      flash('Export fehlgeschlagen');
    }
  }

  function exportRequestsCsv(mode = 'all') {
    const rows = mode === 'played' ? requests.filter((r) => r.status === 'played') : requests;
    const header = ['ID','Status','Song','Interpret','Gast','Zeit','Spotify Track URI','Spotify URL'];
    const lines = [header.map(csvEscape).join(';')];
    rows.forEach((r) => {
      lines.push([
        r.id,
        statusLabel(r.status),
        r.song_title,
        r.artist,
        r.guest_name,
        r.created_at,
        r.spotify_track_uri,
        r.spotify_url
      ].map(csvEscape).join(';'));
    });
    const date = new Date().toISOString().slice(0,10);
    downloadTextFile(`dj-wuensche-${mode}-${date}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
    addLog('Export', `${rows.length} Wünsche exportiert (${mode})`, 'info');
    flash('Export erstellt');
  }

  function exportLogsCsv() {
    const header = ['Zeit','Typ','Bereich','Meldung','Details'];
    const lines = [header.map(csvEscape).join(';')];
    logs.forEach((log) => lines.push([log.time, log.type, log.area, log.message, log.details].map(csvEscape).join(';')));
    const date = new Date().toISOString().slice(0,10);
    downloadTextFile(`dj-fehlerlog-${date}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
    flash('Fehler-Log exportiert');
  }

  async function onStatusChange(id, status, options = {}) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error('Status konnte nicht gespeichert werden');
      if (status === 'accepted' && autoPlaylist && !options.skipAutoPlaylist) {
        const item = requests.find((r) => r.id === id);
        if (item) {
          addLog('Auto-Playlist', 'Angenommener Wunsch wird automatisch zur Playlist hinzugefügt', 'info', buildQuery(item));
          await addToSpotifyPlaylist({ ...item, status: 'accepted' });
        }
      }
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

  async function saveEvent(nextStatus = guestPageStatus, nextName = eventName, nextCode = eventCode, nextClosedMessage = closedMessage, nextShowGuestQueue = showGuestQueue, nextShowNowPlaying = showNowPlaying) {
    try {
      const res = await fetch('/api/event', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName,
          code: nextCode,
          isActive: nextStatus === 'EIN',
          closedMessage: nextClosedMessage,
          showGuestQueue: nextShowGuestQueue,
          showNowPlaying: nextShowNowPlaying
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
    saveEvent(nextStatus, eventName, eventCode, closedMessage, showGuestQueue, showNowPlaying);
  }

  function applyClosedMessage(message) {
    setClosedMessage(message);
    saveEvent(guestPageStatus, eventName, eventCode, message, showGuestQueue, showNowPlaying);
  }

  function toggleGuestOption(optionName) {
    if (optionName === 'queue') {
      const next = !showGuestQueue;
      setShowGuestQueue(next);
      saveEvent(guestPageStatus, eventName, eventCode, closedMessage, next, showNowPlaying);
      return;
    }
    if (optionName === 'nowPlaying') {
      const next = !showNowPlaying;
      setShowNowPlaying(next);
      saveEvent(guestPageStatus, eventName, eventCode, closedMessage, showGuestQueue, next);
    }
  }

  async function spotifyLogin() {
    try {
      // Server-Login erzwingt die richtige Railway Redirect URI und kann nicht mehr auf localhost fallen.
      localStorage.removeItem(VERIFIER_KEY);
      localStorage.removeItem(REDIRECT_KEY);
      addLog('Spotify Login', 'Weiterleitung über /spotify/login gestartet', 'info');
      window.location.href = '/spotify/login';
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
      await loadSpotifyPlaylists(false, me);
      if (showFlash) flash('Spotify Verbindung OK');
    } catch (error) {
      setSpotifyConnected(false);
      setSpotifyUser(null);
      addLog('Spotify Verbindungstest', error.message || 'Verbindung fehlgeschlagen', 'error');
      if (showFlash) flash('Spotify Verbindung fehlgeschlagen');
    }
  }

  async function loadSpotifyPlaylists(showFlash = true, userOverride = null) {
    try {
      const token = getStoredToken();
      const scopes = getTokenScopes(token);
      const user = userOverride || spotifyUser || await spotifyFetch('https://api.spotify.com/v1/me');
      if (!spotifyUser && user) setSpotifyUser(user);

      const data = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=50');
      const writablePublicLists = (data.items || []).filter((playlist) => {
        const isPublic = playlist.public === true;
        const isOwner = playlist.owner?.id && playlist.owner.id === user?.id;
        const isCollaborative = playlist.collaborative === true;
        return isPublic && (isOwner || isCollaborative);
      });
      setPlaylists(writablePublicLists);

      const saved = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || 'null');
      const nextSelected = writablePublicLists.find((p) => p.id === saved?.id)?.id || writablePublicLists[0]?.id || '';
      setSelectedPlaylistId(nextSelected);
      if (nextSelected) {
        const playlist = writablePublicLists.find((p) => p.id === nextSelected);
        localStorage.setItem(PLAYLIST_KEY, JSON.stringify({ id: playlist.id, name: playlist.name }));
      } else {
        localStorage.removeItem(PLAYLIST_KEY);
      }

      const details = `User: ${user?.id || '-'} | Token-Scopes: ${scopes.join(' ') || '-'} | Nur eigene öffentliche Playlists werden angezeigt.`;
      if (showFlash) flash(`${writablePublicLists.length} eigene öffentliche Playlists geladen`);
      addLog('Spotify Playlists', `${writablePublicLists.length} eigene öffentliche Playlists geladen`, 'info', details);
    } catch (error) {
      addLog('Spotify Playlists', error.message || 'Playlists konnten nicht geladen werden', 'error');
      if (showFlash) flash('Playlists laden fehlgeschlagen');
    }
  }

  async function createPublicPlaylist() {
    try {
      setSpotifyBusy(true);
      const token = getStoredToken();
      if (!isTokenValid(token)) throw new Error('Kein gültiger Spotify Login vorhanden');
      const missingScopes = getMissingSpotifyScopes(token);
      if (missingScopes.length) {
        throw new Error(`Spotify Rechte fehlen: ${missingScopes.join(' ')}. Bitte Spotify Logout und Login neu machen. Aktuelle Token-Scopes: ${getTokenScopes(token).join(' ') || '-'}`);
      }
      const user = spotifyUser || await spotifyFetch('https://api.spotify.com/v1/me');
      if (!user?.id) throw new Error('Spotify Nutzer-ID konnte nicht geladen werden');

      const name = `DJ Musikwünsche ${new Date().toLocaleDateString('de-DE')}`;
      const playlist = await spotifyFetch(`https://api.spotify.com/v1/users/${encodeURIComponent(user.id)}/playlists`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          public: true,
          description: 'Automatisch erstellt von der DJ Wunsch App'
        })
      });

      setPlaylists((prev) => [playlist, ...prev.filter((p) => p.id !== playlist.id)]);
      setSelectedPlaylistId(playlist.id);
      localStorage.setItem(PLAYLIST_KEY, JSON.stringify({ id: playlist.id, name: playlist.name }));
      addLog('Spotify Playlist', `Öffentliche Playlist erstellt: ${playlist.name}`, 'info', `Owner: ${playlist.owner?.id || user.id}`);
      flash('Öffentliche Playlist erstellt');
    } catch (error) {
      addLog('Spotify Playlist erstellen', error.message || 'Playlist konnte nicht erstellt werden', 'error');
      flash('Playlist erstellen fehlgeschlagen');
      setActivePage('errors');
    } finally {
      setSpotifyBusy(false);
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
    if (item?.spotify_track_uri?.startsWith('spotify:track:')) {
      return {
        id: item.spotify_track_id || item.spotify_track_uri.replace('spotify:track:', ''),
        uri: item.spotify_track_uri,
        name: item.song_title || 'Spotify Track',
        artists: [{ name: item.artist || '' }],
        external_urls: { spotify: item.spotify_url || `https://open.spotify.com/track/${item.spotify_track_uri.replace('spotify:track:', '')}` },
        album: { name: item.spotify_album || '', images: item.spotify_image ? [{ url: item.spotify_image }] : [] },
        source: 'guest-selection'
      };
    }

    const query = buildQuery(item);
    if (!query) throw new Error('Song oder Artist fehlt');
    const params = new URLSearchParams({ q: query, type: 'track', limit: '3' });
    const data = await spotifyFetch(`https://api.spotify.com/v1/search?${params.toString()}`);
    const tracks = data?.tracks?.items || [];
    const track = tracks.find((entry) => entry?.type === 'track' && entry?.uri?.startsWith('spotify:track:')) || tracks[0];
    if (!track) throw new Error(`Kein Spotify Treffer gefunden: ${query}`);
    if (!track.uri || !track.uri.startsWith('spotify:track:')) {
      throw new Error(`Spotify Treffer hat keine gültige Track-URI: ${track.uri || '-'}`);
    }
    return track;
  }

  async function getSpotifyPlaylistDetails(playlistId) {
    return spotifyFetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=id,name,public,collaborative,owner(id,display_name),snapshot_id`);
  }

  async function addTrackUriToPlaylist(playlistId, trackUri) {
    if (!trackUri || !trackUri.startsWith('spotify:track:')) {
      throw new Error(`Ungültige Track-URI für Playlist: ${trackUri || '-'}`);
    }

    // Spotify hat den alten /tracks-Endpunkt entfernt. Für neue Apps muss /items genutzt werden.
    // Wichtig: Body muss eine echte Spotify-URI enthalten, z. B. spotify:track:...
    return spotifyFetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items`, {
      method: 'POST',
      body: JSON.stringify({ uris: [trackUri], position: 0 })
    });
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
      const token = getStoredToken();
      if (!isTokenValid(token)) throw new Error('Kein gültiger Spotify Login vorhanden');
      const missingScopes = getMissingSpotifyScopes(token);
      if (missingScopes.length) {
        throw new Error(`Spotify Rechte fehlen: ${missingScopes.join(' ')}. Bitte Spotify Logout und Login neu machen. Aktuelle Token-Scopes: ${getTokenScopes(token).join(' ') || '-'}`);
      }
      if (!selectedPlaylistId) throw new Error('Bitte erst eine eigene öffentliche Playlist auswählen oder eine neue erstellen');

      const playlist = playlists.find((p) => p.id === selectedPlaylistId);
      const user = spotifyUser || await spotifyFetch('https://api.spotify.com/v1/me');
      const playlistDetails = await getSpotifyPlaylistDetails(selectedPlaylistId);
      const effectivePlaylist = playlistDetails || playlist;
      if (effectivePlaylist && effectivePlaylist.public !== true) throw new Error('Die gewählte Playlist ist nicht öffentlich');
      if (effectivePlaylist && effectivePlaylist.owner?.id !== user?.id && effectivePlaylist.collaborative !== true) {
        throw new Error(`Diese Playlist gehört nicht deinem eingeloggten Spotify-Konto. Owner: ${effectivePlaylist.owner?.id || '-'} | Du: ${user?.id || '-'}`);
      }

      const track = await findSpotifyTrack(item);
      const result = await addTrackUriToPlaylist(selectedPlaylistId, track.uri);
      const playlistName = effectivePlaylist?.name || playlist?.name || 'ausgewählte Playlist';
      addLog(
        'Spotify Playlist',
        `Hinzugefügt: ${track.name} → ${playlistName}`,
        'info',
        `${buildQuery(item)} | Quelle: ${track.source === 'guest-selection' ? 'Gäste-Spotify-Auswahl' : 'Dashboard-Suche'} | Track-URI: ${track.uri} | Track-ID: ${track.id || '-'} | Playlist-ID: ${selectedPlaylistId} | Snapshot: ${result?.snapshot_id || '-'}`
      );
      await onStatusChange(item.id, 'accepted', { skipAutoPlaylist: true });
      addLog('Wunsch-Status', 'Nach Spotify automatisch auf Angenommen gesetzt', 'info', `${buildQuery(item)} | ID: ${item.id}`);
      flash('Zur Spotify Playlist hinzugefügt und als angenommen markiert');
    } catch (error) {
      const playlist = playlists.find((p) => p.id === selectedPlaylistId);
      let trackInfo = 'Track-URI: -';
      try {
        const debugTrack = await findSpotifyTrack(item);
        trackInfo = `Track: ${debugTrack.name || '-'} | Track-URI: ${debugTrack.uri || '-'} | Track-ID: ${debugTrack.id || '-'}`;
      } catch (trackError) {
        trackInfo = `Track-Suche Fehler: ${trackError.message || trackError}`;
      }
      const details = `${buildQuery(item)} | ${trackInfo} | Playlist-ID: ${selectedPlaylistId || '-'} | Playlist: ${playlist?.name || '-'} | Owner: ${playlist?.owner?.id || '-'} | Public: ${playlist?.public} | Collaborative: ${playlist?.collaborative} | Token-Scopes: ${getTokenScopes().join(' ') || '-'}`;
      addLog('Spotify Playlist', error.message || 'Hinzufügen fehlgeschlagen', 'error', details);
      flash('Playlist hinzufügen fehlgeschlagen');
      setActivePage('errors');
    } finally {
      setSpotifyBusy(false);
    }
  }

  function spotifyQuality(item) {
    const hasTrack = Boolean(item.spotify_track_uri || item.spotify_url);
    const hasUri = Boolean(item.spotify_track_uri?.startsWith?.('spotify:track:'));
    const inPlaylist = item.status === 'accepted' || item.status === 'played';
    if (hasUri) return { label: inPlaylist ? 'Spotify OK · Playlist bereit' : 'Spotify OK', className: 'badge badge-spotify' };
    if (hasTrack) return { label: 'Spotify-Link', className: 'badge badge-spotify' };
    return { label: 'Ohne Spotify', className: 'badge badge-warn' };
  }


  function renderSpotifyBadges(item) {
    if (!spotifyInfoEnhanced) {
      return (item.spotify_track_uri || item.spotify_url) ? <span className="badge badge-spotify">Spotify Track</span> : <span className="badge badge-soft">Manuell</span>;
    }
    const quality = spotifyQuality(item);
    return (
      <>
        <span className={quality.className}>{quality.label}</span>
        {item.spotify_track_uri ? <span className="badge badge-soft">URI gespeichert</span> : null}
        {selectedPlaylist && (item.spotify_track_uri || item.spotify_url) ? <span className="badge badge-soft">Playlist: {selectedPlaylist.name}</span> : null}
      </>
    );
  }

  function renderRequestCard(item) {
    return (
      <div
        key={item.id}
        className={requestClass(item.status, compactMode)}
      >
        <div className="request-head">
          <div className="request-main">
            {item.spotify_image ? <img className="request-cover" src={item.spotify_image} alt="" /> : <div className="request-cover empty">♪</div>}
            <div className="request-text">
              <div className="request-title-row">
                <h3 className="request-title">{item.song_title}</h3>
                <span className={badgeClass(item.status)}>{statusLabel(item.status)}</span>
                {renderSpotifyBadges(item)}
              </div>
              <div className="request-meta">{item.artist}</div>
              <div className="request-submeta">von {item.guest_name} · {item.created_at}</div>
              {spotifyInfoEnhanced ? (
                <div className="spotify-info-line">
                  <span>{item.spotify_track_uri ? '✅ Spotify-Track gespeichert' : '⚠️ Kein Spotify-Track gespeichert'}</span>
                  <span>{spotifyConnected ? 'Spotify verbunden' : 'Spotify nicht verbunden'}</span>
                  <span>{selectedPlaylist ? selectedPlaylist.name : 'Keine Playlist gewählt'}</span>
                </div>
              ) : (
                <div className="request-submeta" style={{ marginTop: 10, color: spotifyConnected ? 'rgba(110,231,183,.9)' : 'rgba(252,165,165,.9)' }}>
                  Spotify: {spotifyConnected ? `verbunden${selectedPlaylist ? ` · Playlist: ${selectedPlaylist.name}` : ''}` : 'nicht verbunden'}
                </div>
              )}
            </div>
          </div>

          <div className="request-tools">
            <div className="request-id">#{item.id}</div>
            <button className="btn btn-icon btn-danger" onClick={() => onDelete(item.id)} aria-label="Wunsch entfernen" title="Wunsch entfernen">×</button>
          </div>
        </div>

        <div className="request-actions">
          <button className="btn btn-accept" onClick={() => onStatusChange(item.id, 'accepted')}>Angenommen</button>
          <button className="btn btn-played" onClick={() => onStatusChange(item.id, 'played')}>Gespielt</button>
          <button className="btn btn-spotify" disabled={spotifyBusy} onClick={() => addToSpotifyPlaylist(item)}>Zu Spotify</button>
          <button className="btn btn-secondary" disabled={spotifyBusy} onClick={() => openInSpotify(item)}>Spotify öffnen</button>
          <button className="btn btn-spotify" disabled={spotifyBusy} onClick={() => addToSpotifyPlaylist(item)}>+ Playlist</button>
          <button className="btn btn-ghost" onClick={() => onStatusChange(item.id, 'open')}>Zurück auf offen</button>
          <button className="btn btn-reject" onClick={() => onStatusChange(item.id, 'rejected')}>Ablehnen</button>
        </div>
      </div>
    );
  }

  function spotifyDebugText() {
    const config = getSpotifyConfig();
    const token = getStoredToken();
    return {
      clientId: config.clientId ? 'Vorhanden' : 'FEHLT',
      redirectUri: config.redirectUri || 'FEHLT',
      scopes: config.scopes,
      tokenScopes: getTokenScopes(token).join(' ') || '-',
      modifyPublic: getTokenScopes(token).includes('playlist-modify-public') ? 'OK' : 'FEHLT',
      modifyPrivate: getTokenScopes(token).includes('playlist-modify-private') ? 'OK' : 'FEHLT',
      token: isTokenValid(token) ? 'Gültig' : token?.access_token ? 'Abgelaufen' : 'Nicht vorhanden'
    };
  }

  const logStats = useMemo(() => ({
    all: logs.length,
    error: logs.filter((log) => log.type === 'error').length,
    info: logs.filter((log) => log.type !== 'error').length,
    spotify: logs.filter((log) => log.area.toLowerCase().includes('spotify')).length,
    guest: logs.filter((log) => log.area.toLowerCase().includes('gäste') || log.area.toLowerCase().includes('gast')).length,
    requests: logs.filter((log) => log.area.toLowerCase().includes('wunsch')).length
  }), [logs]);

  const visibleLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logFilter === 'all') return true;
      if (logFilter === 'error') return log.type === 'error';
      if (logFilter === 'info') return log.type !== 'error';
      if (logFilter === 'spotify') return log.area.toLowerCase().includes('spotify');
      if (logFilter === 'guest') return log.area.toLowerCase().includes('gäste') || log.area.toLowerCase().includes('gast');
      if (logFilter === 'requests') return log.area.toLowerCase().includes('wunsch');
      return true;
    });
  }, [logs, logFilter]);

  const debug = spotifyDebugText();

  return (
    <main className={djMode ? 'page-shell dj-fullscreen' : 'page-shell'}>
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
          <button className={activePage === 'dashboard' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActivePage('dashboard')}>Dashboard</button>
          <button className={activePage === 'settings' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActivePage('settings')}>Einstellungen</button>
          <button className={activePage === 'errors' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActivePage('errors')}>Fehler-Log</button>
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
                <div className="info-row"><span>Login-Scopes angefragt</span><span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{debug.scopes}</span></div>
                <div className="info-row"><span>Token-Scopes erhalten</span><span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{debug.tokenScopes}</span></div>
                <div className="info-row"><span>Recht Playlist hinzufügen</span><span>{debug.modifyPublic}</span></div>
              </div>

              <div className="filter-row" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={spotifyLogin}>Spotify Login</button>
                <button className="btn btn-secondary" onClick={spotifyLogout}>Spotify Logout</button>
                <button className="btn btn-secondary" onClick={() => refreshSpotifyStatus(true)}>Verbindung testen</button>
                <button className="btn btn-secondary" onClick={() => loadSpotifyPlaylists(true)}>Eigene Playlists neu laden</button>
              </div>
            </div>

            <div className="panel panel-pad">
              <div className="section-head">
                <h2 className="section-title">Öffentliche Playlist</h2>
                <span className="badge badge-soft">nur eigene public</span>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="label">Playlist auswählen</label>
                <select className="input" value={selectedPlaylistId} onChange={(e) => onPlaylistSelect(e.target.value)}>
                  <option value="">Keine Playlist gewählt</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>{playlist.name} · Owner: {playlist.owner?.display_name || playlist.owner?.id || '-'}</option>
                  ))}
                </select>
              </div>

              <div className="info-list">
                <div className="info-row"><span>Ausgewählt</span><span>{selectedPlaylist?.name || '-'}</span></div>
                <div className="info-row"><span>Geladene eigene öffentliche Playlists</span><span>{playlists.length}</span></div>
                <div className="info-row"><span>Playlist Owner</span><span>{selectedPlaylist?.owner?.display_name || selectedPlaylist?.owner?.id || '-'}</span></div>
                <div className="info-row"><span>Playlist ID</span><span style={{ overflowWrap: 'anywhere', textAlign: 'right' }}>{selectedPlaylistId || '-'}</span></div>
                <div className="info-row"><span>Public</span><span>{selectedPlaylist ? String(selectedPlaylist.public) : '-'}</span></div>
                <div className="info-row"><span>Hinzufügen</span><span>{selectedPlaylistId ? 'Bereit' : 'Playlist fehlt'}</span></div>
              </div>

              <div className="filter-row" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" disabled={spotifyBusy || !spotifyConnected} onClick={createPublicPlaylist}>Neue öffentliche Playlist erstellen</button>
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
            <div className="filter-row">
              <button className="btn btn-secondary" onClick={exportLogsCsv}>Log exportieren</button>
              <button className="btn btn-secondary" onClick={clearLogs}>Log löschen</button>
            </div>
          </div>
          <div className="filter-row log-filter-row" style={{ marginTop: 16 }}>
            {[
              ['all', 'Alle', logStats.all],
              ['error', 'Nur Fehler', logStats.error],
              ['info', 'Nur Info', logStats.info],
              ['spotify', 'Spotify', logStats.spotify],
              ['guest', 'Gäste-Seite', logStats.guest],
              ['requests', 'Wünsche', logStats.requests]
            ].map(([key, label, count]) => (
              <button key={key} className={logFilter === key ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setLogFilter(key)}>
                {label} <span className="btn-count">{count}</span>
              </button>
            ))}
          </div>
          <div className="info-list">
            {visibleLogs.map((log) => (
              <div className={log.type === 'error' ? 'info-row log-row log-error' : 'info-row log-row log-info'} key={log.id}>
                <span style={{ minWidth: 170 }}>
                  <b>{log.area}</b><br />
                  <small>{log.time}</small><br />
                  <small>{log.type === 'error' ? 'Fehler' : 'Info'}</small>
                </span>
                <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>
                  {log.message}
                  {log.details ? <><br /><small>{log.details}</small></> : null}
                </span>
              </div>
            ))}
            {visibleLogs.length === 0 ? <div className="info-row"><span>Keine Einträge in diesem Filter</span><span>OK</span></div> : null}
          </div>
        </div>
      ) : null}


      {activePage === 'settings' ? (
        <div className="dashboard-grid settings-page-grid">
          <div className="stack">
            <div className="panel panel-pad">
              <div className="section-head">
                <h2 className="section-title">Event Übersicht</h2>
                <span className="badge badge-soft">{guestPageStatus}</span>
              </div>

              <div className="field-grid" style={{ marginTop: 16 }}>
                <div className="full">
                  <label className="label">Eventname</label>
                  <input className="input" value={eventName} onChange={(e) => setEventName(e.target.value)} onBlur={() => saveEvent(guestPageStatus, eventName, eventCode, closedMessage, showGuestQueue, showNowPlaying)} />
                </div>
                <div>
                  <label className="label">Event-Code</label>
                  <input className="input" value={eventCode} onChange={(e) => setEventCode(e.target.value.toUpperCase())} onBlur={() => saveEvent(guestPageStatus, eventName, eventCode, closedMessage, showGuestQueue, showNowPlaying)} />
                </div>
                <div>
                  <label className="label">Gäste-Seite</label>
                  <input className="input" value={guestPageStatus} readOnly />
                </div>
              </div>

              <div className="info-list" style={{ marginTop: 16 }}>
                <div className="info-row"><span>Seite</span><span>{guestPageStatus === 'EIN' ? 'Wunschformular sichtbar' : 'Geschlossen-Seite sichtbar'}</span></div>
                <div className="info-row"><span>Jetzt läuft</span><span>{showNowPlaying ? 'Sichtbar' : 'Aus'}</span></div>
                <div className="info-row"><span>Warteliste</span><span>{showGuestQueue ? 'Sichtbar' : 'Aus'}</span></div>
                <div className="info-row"><span>Aktuell gespielt</span><span>{nowPlaying ? `${nowPlaying.song_title} - ${nowPlaying.artist}` : '-'}</span></div>
              </div>

              <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                <button className="btn btn-secondary btn-block" onClick={toggleGuestPage}>{guestPageStatus === 'EIN' ? 'Gäste-Seite ausschalten' : 'Gäste-Seite einschalten'}</button>
                <button className="btn btn-secondary btn-block" onClick={() => toggleGuestOption('nowPlaying')}>{showNowPlaying ? 'Jetzt-läuft-Anzeige ausblenden' : 'Jetzt-läuft-Anzeige anzeigen'}</button>
                <button className="btn btn-secondary btn-block" onClick={() => toggleGuestOption('queue')}>{showGuestQueue ? 'Warteliste für Gäste ausblenden' : 'Warteliste für Gäste anzeigen'}</button>
              </div>

              <div className="guest-settings-box">
                <label className="label">Text, wenn Gäste-Seite AUS ist</label>
                <textarea className="input textarea" value={closedMessage} onChange={(e) => setClosedMessage(e.target.value)} onBlur={() => saveEvent(guestPageStatus, eventName, eventCode, closedMessage, showGuestQueue, showNowPlaying)} />
                <div className="preset-grid">
                  {CLOSED_MESSAGE_PRESETS.map((message) => (
                    <button className="btn btn-secondary" key={message} type="button" onClick={() => applyClosedMessage(message)}>{message}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel panel-pad">
              <div className="section-head">
                <h2 className="section-title">Export nach dem Abend</h2>
                <span className="badge badge-soft">CSV</span>
              </div>
              <div className="info-list" style={{ marginTop: 16 }}>
                <div className="info-row"><span>Alle Wünsche</span><span>{requests.length}</span></div>
                <div className="info-row"><span>Gespielte Songs</span><span>{stats.played}</span></div>
                <div className="info-row"><span>Fehler-Log</span><span>{logs.length}</span></div>
              </div>
              <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                <button className="btn btn-secondary btn-block" onClick={() => exportRequestsCsv('all')}>Alle Wünsche als CSV exportieren</button>
                <button className="btn btn-secondary btn-block" onClick={() => exportRequestsCsv('played')}>Gespielte Songs exportieren</button>
                <button className="btn btn-secondary btn-block" onClick={exportLogsCsv}>Fehler-Log exportieren</button>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="panel panel-pad">
              <div className="section-head">
                <h2 className="section-title">Spotify</h2>
                <span className={spotifyConnected ? 'badge badge-played' : 'badge badge-rejected'}>{spotifyConnected ? 'Verbunden' : 'Nicht verbunden'}</span>
              </div>

              <div className="info-list" style={{ marginTop: 16 }}>
                <div className="info-row"><span>Status</span><span>{spotifyConnected ? 'Verbunden' : 'Nicht verbunden'}</span></div>
                <div className="info-row"><span>Nutzer</span><span>{spotifyUser?.display_name || spotifyUser?.id || '-'}</span></div>
                <div className="info-row"><span>Playlist</span><span>{selectedPlaylist?.name || 'Keine gewählt'}</span></div>
                <div className="info-row"><span>Recht Playlist hinzufügen</span><span>{debug.modifyPublic}</span></div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="label">Öffentliche Playlist auswählen</label>
                <select className="input" value={selectedPlaylistId} onChange={(e) => onPlaylistSelect(e.target.value)}>
                  <option value="">Keine Playlist gewählt</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
                  ))}
                </select>
              </div>

              <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                <button className="btn btn-primary btn-block" onClick={spotifyLogin}>Spotify Login</button>
                <button className="btn btn-secondary btn-block" onClick={spotifyLogout}>Spotify Logout</button>
                <button className="btn btn-secondary btn-block" onClick={() => refreshSpotifyStatus(true)}>Verbindung testen</button>
                <button className="btn btn-secondary btn-block" onClick={() => loadSpotifyPlaylists(true)}>Eigene öffentliche Playlists laden</button>
                <button className="btn btn-secondary btn-block" disabled={spotifyBusy || !spotifyConnected} onClick={createPublicPlaylist}>Neue öffentliche Playlist erstellen</button>
                <button className="btn btn-secondary btn-block" onClick={() => setActivePage('spotify')}>Spotify Detailseite öffnen</button>
              </div>
            </div>

            <div className="panel panel-pad">
              <div className="section-head">
                <h2 className="section-title">DJ-Komfort</h2>
                <span className="badge badge-soft">Live-Betrieb</span>
              </div>
              <div className="info-list" style={{ marginTop: 16 }}>
                <div className="info-row"><span>DJ-Modus</span><span>{djMode ? 'Vollbild aktiv' : 'Normal'}</span></div>
                <div className="info-row"><span>Kompaktmodus</span><span>{compactMode ? 'Aktiv' : 'Aus'}</span></div>
                <div className="info-row"><span>Gespielte ausblenden</span><span>{hideDone ? 'Aktiv' : 'Aus'}</span></div>
                <div className="info-row"><span>Auto-Playlist</span><span>{autoPlaylist ? 'Angenommen = Playlist' : 'Aus'}</span></div>
                <div className="info-row"><span>Neuer Wunsch</span><span>{soundEnabled ? 'Signalton aktiv' : 'Ton aus'}</span></div>
                <div className="info-row"><span>Gespielte unten</span><span>{playedBottomEnabled ? 'Aktiv' : 'Aus'}</span></div>
                <div className="info-row"><span>Spotify-Anzeige</span><span>{spotifyInfoEnhanced ? 'Erweitert' : 'Einfach'}</span></div>
              </div>
              <div className="stack" style={{ gap: 10, marginTop: 14 }}>
                <button className={djMode ? 'btn btn-primary btn-block' : 'btn btn-secondary btn-block'} onClick={toggleDjMode}>{djMode ? 'DJ-Modus beenden' : 'DJ-Modus starten'}</button>
                <button className={compactMode ? 'btn btn-primary btn-block' : 'btn btn-secondary btn-block'} onClick={() => setCompactMode((v) => !v)}>{compactMode ? 'Kompaktmodus ausschalten' : 'Kompaktmodus einschalten'}</button>
                <button className={hideDone ? 'btn btn-primary btn-block' : 'btn btn-secondary btn-block'} onClick={() => setHideDone((v) => !v)}>{hideDone ? 'Gespielte wieder anzeigen' : 'Gespielte ausblenden'}</button>
                <button className={autoPlaylist ? 'btn btn-primary btn-block' : 'btn btn-secondary btn-block'} onClick={() => setAutoPlaylist((v) => !v)}>{autoPlaylist ? 'Auto-Playlist ausschalten' : 'Auto-Playlist einschalten'}</button>
                <button className={soundEnabled ? 'btn btn-primary btn-block' : 'btn btn-secondary btn-block'} onClick={toggleSound}>{soundEnabled ? 'Signalton ausschalten' : 'Signalton einschalten'}</button>
                <button className={playedBottomEnabled ? 'btn btn-primary btn-block' : 'btn btn-secondary btn-block'} onClick={() => setPlayedBottomEnabled((v) => !v)}>{playedBottomEnabled ? 'Gespielte unten ausschalten' : 'Gespielte unten einschalten'}</button>
                <button className={spotifyInfoEnhanced ? 'btn btn-primary btn-block' : 'btn btn-secondary btn-block'} onClick={() => setSpotifyInfoEnhanced((v) => !v)}>{spotifyInfoEnhanced ? 'Spotify-Anzeige einfach' : 'Spotify-Anzeige verbessern'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {activePage === 'dashboard' ? (
        <>
          <div className="dashboard-hero panel panel-pad">
            <div>
              <div className="eyebrow">Live-Übersicht</div>
              <h2 className="dashboard-hero-title">{stats.open} neue Wünsche · {stats.accepted} angenommen</h2>
              <p>Spotify: {spotifyConnected ? 'verbunden' : 'nicht verbunden'} · Gäste-Seite: {guestPageStatus} · Playlist: {selectedPlaylist?.name || 'keine gewählt'}</p>
            </div>
            <div className="hero-actions">
              <button className="btn btn-secondary" onClick={toggleGuestPage}>{guestPageStatus === 'EIN' ? 'Gäste-Seite AUS' : 'Gäste-Seite EIN'}</button>
              <button className="btn btn-secondary" onClick={() => setCompactMode((v) => !v)}>{compactMode ? 'Große Karten' : 'Kompaktmodus'}</button>
              <button className="btn btn-secondary" onClick={() => setHideDone((v) => !v)}>{hideDone ? 'Gespielte anzeigen' : 'Gespielte ausblenden'}</button>
              <button className="btn btn-primary" onClick={() => setActivePage('settings')}>Einstellungen öffnen</button>
            </div>
          </div>

          <div className="stats-grid stats-grid-wide">
            <div className="panel panel-pad stat-card"><div className="stat-label">Gesamt</div><div className="stat-value">{stats.total}</div><div className="stat-sub">alle Wünsche</div></div>
            <div className="panel panel-pad stat-card stat-open"><div className="stat-label">Offen</div><div className="stat-value">{stats.open}</div><div className="stat-sub">neu eingegangen</div></div>
            <div className="panel panel-pad stat-card stat-accepted"><div className="stat-label">Angenommen</div><div className="stat-value">{stats.accepted}</div><div className="stat-sub">für später</div></div>
            <div className="panel panel-pad stat-card stat-played"><div className="stat-label">Gespielt</div><div className="stat-value">{stats.played}</div><div className="stat-sub">schon durch</div></div>
            <div className="panel panel-pad stat-card stat-rejected"><div className="stat-label">Abgelehnt</div><div className="stat-value">{stats.rejected}</div><div className="stat-sub">ausgeblendet</div></div>
            <div className="panel panel-pad stat-card stat-spotify"><div className="stat-label">Spotify</div><div className="stat-value">{stats.spotify}</div><div className="stat-sub">Track gewählt</div></div>
          </div>

          <div className="stack">
            <div className="panel panel-pad dashboard-controls">
              <div className="toolbar">
                <input className="input search-input" placeholder="Song, Artist oder Gast suchen..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="filter-row filter-pills">
                  {filterButtons.map(([key, label, count]) => (
                    <button key={key} className={filter === key ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setFilter(key)}>
                      {label} <span className="btn-count">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mini-toolbar">
                <span>{filtered.length} sichtbar</span>
                <span>Gäste-Seite: {guestPageStatus}</span>
                <span>Spotify: {spotifyConnected ? 'verbunden' : 'nicht verbunden'}</span>
                <span>Auto-Playlist: {autoPlaylist ? 'EIN' : 'AUS'}</span>
              </div>
            </div>

            <div className="request-list">
              {filtered.map((item) => renderRequestCard(item))}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
