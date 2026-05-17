'use client';

import { useEffect, useMemo, useState } from 'react';

function guestStatusLabel(status) {
  if (status === 'open') return 'Wartet auf den DJ';
  if (status === 'accepted') return 'Angenommen';
  if (status === 'played') return 'Gespielt';
  if (status === 'rejected') return 'Abgelehnt';
  if (status === 'deleted') return 'Nicht mehr in der Liste';
  return 'Gesendet';
}

function guestStatusText(status) {
  if (status === 'open') return 'Dein Wunsch ist angekommen und liegt jetzt beim DJ.';
  if (status === 'accepted') return 'Der DJ hat deinen Wunsch angenommen.';
  if (status === 'played') return 'Dein Wunsch wurde gespielt.';
  if (status === 'rejected') return 'Der DJ kann diesen Wunsch leider nicht spielen.';
  if (status === 'deleted') return 'Der Wunsch ist nicht mehr in der aktuellen DJ-Liste.';
  return 'Danke, dein Wunsch wurde gespeichert.';
}

function guestStatusClass(status) {
  if (status === 'accepted') return 'guest-status accepted';
  if (status === 'played') return 'guest-status played';
  if (status === 'rejected' || status === 'deleted') return 'guest-status rejected';
  return 'guest-status open';
}

function queueStatusLabel(status) {
  if (status === 'accepted') return 'Angenommen';
  if (status === 'played') return 'Gespielt';
  if (status === 'rejected') return 'Abgelehnt';
  return 'Wartet';
}

const STATUS_SORT_ORDER = { open: 0, accepted: 1, played: 2, rejected: 3 };

export default function GuestRequestForm({ eventCode, eventName, isActive: initialIsActive }) {
  const [name, setName] = useState('');
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [sentRequest, setSentRequest] = useState(null);
  const [error, setError] = useState('');
  const [isActive, setIsActive] = useState(initialIsActive);
  const [liveEventName, setLiveEventName] = useState(eventName);
  const [liveEventCode, setLiveEventCode] = useState(eventCode);
  const [closedMessage, setClosedMessage] = useState('Wünsche sind kurz pausiert. Der DJ ist gleich wieder bereit.');
  const [showGuestQueue, setShowGuestQueue] = useState(true);
  const [showNowPlaying, setShowNowPlaying] = useState(true);
  const [guestRequests, setGuestRequests] = useState([]);
  const [sending, setSending] = useState(false);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifySuggestions, setSpotifySuggestions] = useState([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [spotifySearchError, setSpotifySearchError] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);

  const cleanName = useMemo(() => name.trim(), [name]);
  const cleanSong = useMemo(() => song.trim(), [song]);
  const cleanArtist = useMemo(() => artist.trim(), [artist]);
  const cleanSpotifyQuery = useMemo(() => spotifyQuery.trim(), [spotifyQuery]);
  const nowPlaying = useMemo(() => guestRequests.find((item) => item.status === 'played') || null, [guestRequests]);
  const guestQueue = useMemo(() => {
    return [...guestRequests]
      .filter((item) => item.status === 'open' || item.status === 'accepted')
      .sort((a, b) => {
        const statusDiff = (STATUS_SORT_ORDER[a.status] ?? 9) - (STATUS_SORT_ORDER[b.status] ?? 9);
        if (statusDiff !== 0) return statusDiff;
        return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
      })
      .slice(0, 8);
  }, [guestRequests]);

  useEffect(() => {
    let stopped = false;

    async function loadEvent() {
      try {
        const res = await fetch('/api/event', { cache: 'no-store' });
        const data = await res.json();
        if (!stopped && data.event) {
          setIsActive(Boolean(data.event.isActive));
          setLiveEventName(data.event.name || eventName);
          setLiveEventCode(data.event.code || eventCode);
          setClosedMessage(data.event.closedMessage || 'Wünsche sind kurz pausiert. Der DJ ist gleich wieder bereit.');
          setShowGuestQueue(data.event.showGuestQueue !== false);
          setShowNowPlaying(data.event.showNowPlaying !== false);
        }
      } catch {}
    }

    loadEvent();
    const interval = setInterval(loadEvent, 2000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [eventCode, eventName]);

  useEffect(() => {
    let stopped = false;

    async function loadGuestRequests() {
      try {
        const res = await fetch('/api/requests', { cache: 'no-store' });
        const data = await res.json();
        if (!stopped && Array.isArray(data.requests)) {
          setGuestRequests(data.requests);
        }
      } catch {}
    }

    loadGuestRequests();
    const interval = setInterval(loadGuestRequests, 3000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!sentRequest?.id) return;

    let stopped = false;

    async function loadStatus() {
      try {
        const res = await fetch('/api/requests', { cache: 'no-store' });
        const data = await res.json();
        const found = Array.isArray(data.requests)
          ? data.requests.find((item) => String(item.id) === String(sentRequest.id))
          : null;

        if (stopped) return;

        if (found) {
          setSentRequest((prev) => ({ ...prev, ...found }));
        } else {
          setSentRequest((prev) => (prev ? { ...prev, status: 'deleted' } : prev));
        }
      } catch {}
    }

    loadStatus();
    const interval = setInterval(loadStatus, 3000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [sentRequest?.id]);

  useEffect(() => {
    let stopped = false;
    const query = cleanSpotifyQuery || `${cleanSong} ${cleanArtist}`.trim();

    setSpotifySearchError('');
    if (query.length < 3) {
      setSpotifySuggestions([]);
      setSpotifySearching(false);
      return () => {
        stopped = true;
      };
    }

    setSpotifySearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
        const data = await res.json();
        if (stopped) return;
        if (!res.ok) {
          setSpotifySuggestions([]);
          setSpotifySearchError(data.error || 'Spotify Suche nicht verfügbar. Du kannst den Wunsch manuell senden.');
          return;
        }
        setSpotifySuggestions(Array.isArray(data.tracks) ? data.tracks : []);
      } catch {
        if (!stopped) {
          setSpotifySuggestions([]);
          setSpotifySearchError('Spotify Suche nicht verfügbar. Du kannst den Wunsch manuell senden.');
        }
      } finally {
        if (!stopped) setSpotifySearching(false);
      }
    }, 450);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [cleanSpotifyQuery, cleanSong, cleanArtist]);

  function selectSpotifyTrack(track) {
    setSelectedTrack(track);
    setSong(track.name || '');
    setArtist(track.artist || '');
    setSpotifyQuery(`${track.name || ''} ${track.artist || ''}`.trim());
    setSpotifySuggestions([]);
    setSpotifySearchError('');
  }

  function clearSelectedTrack() {
    setSelectedTrack(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!cleanName || !cleanSong || !cleanArtist) {
      setError('Bitte Name/Tisch, Song und Interpret ausfüllen. Du kannst einen Spotify-Vorschlag wählen oder manuell schreiben.');
      return;
    }

    setSending(true);

    try {
      const eventRes = await fetch('/api/event', { cache: 'no-store' });
      const eventData = await eventRes.json();
      if (!eventData?.event?.isActive) {
        setIsActive(false);
        setError('Momentan keine Musikwünsche möglich.');
        return;
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: cleanName,
          song_title: cleanSong,
          artist: cleanArtist,
          spotify_track_id: selectedTrack?.id || '',
          spotify_track_uri: selectedTrack?.uri || '',
          spotify_url: selectedTrack?.spotifyUrl || '',
          spotify_image: selectedTrack?.image || '',
          spotify_album: selectedTrack?.album || ''
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Fehler beim Absenden.');
        return;
      }

      setSentRequest(data.request || {
        guest_name: cleanName,
        song_title: cleanSong,
        artist: cleanArtist,
        status: 'open',
        spotify_track_uri: selectedTrack?.uri || '',
        spotify_url: selectedTrack?.spotifyUrl || '',
        spotify_image: selectedTrack?.image || '',
        spotify_album: selectedTrack?.album || ''
      });
      setName('');
      setSong('');
      setArtist('');
      setSpotifyQuery('');
      setSelectedTrack(null);
      setSpotifySuggestions([]);
    } catch {
      setError('Fehler beim Absenden.');
    } finally {
      setSending(false);
    }
  }

  if (!isActive) {
    return (
      <main className="guest-page">
        <div className="guest-wrap">
          <div className="guest-head guest-hero">
            <div className="guest-logo guest-logo-large">🎧</div>
            <div className="guest-kicker">DJ Wunsch App</div>
            <h1 className="guest-title">Musikwünsche pausiert</h1>
            <p className="guest-sub">{liveEventName}</p>
            <div className="guest-badge-wrap">
              <span className="badge badge-soft">Code: {liveEventCode}</span>
            </div>
          </div>

          <div className="panel guest-card guest-card-pretty">
            <div className="closed-box">
              <div className="closed-icon">⏸️</div>
              <h2 className="closed-title closed-title-small">Der DJ nimmt gerade keine Wünsche an.</h2>
              <p className="closed-text closed-text-big">{closedMessage}</p>
              <p className="closed-hint">Sobald der DJ die Seite wieder freigibt, kannst du hier deinen Songwunsch senden.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (sentRequest) {
    return (
      <main className="guest-page">
        <div className="guest-wrap">
          <div className="guest-head guest-hero">
            <div className="guest-logo guest-logo-large">✅</div>
            <div className="guest-kicker">Wunsch gesendet</div>
            <h1 className="guest-title">Danke für deinen Musikwunsch</h1>
            <p className="guest-sub">{liveEventName}</p>
            <div className="guest-badge-wrap">
              <span className="badge badge-soft">Code: {liveEventCode}</span>
            </div>
          </div>

          <div className="panel guest-card guest-card-pretty thanks-card">
            <div className="thanks-icon">🎶</div>
            <h2 className="thanks-title">Dein Wunsch ist beim DJ angekommen.</h2>
            <div className="guest-request-summary">
              {sentRequest.spotify_image ? <img className="guest-summary-cover" src={sentRequest.spotify_image} alt="Spotify Cover" /> : null}
              <strong>{sentRequest.song_title}</strong>
              <span>{sentRequest.artist}</span>
              {sentRequest.spotify_album ? <small>Album: {sentRequest.spotify_album}</small> : null}
              <small>Gesendet von {sentRequest.guest_name || 'Gast'}</small>
            </div>

            <div className={guestStatusClass(sentRequest.status)}>
              <span className="guest-status-label">Status</span>
              <strong>{guestStatusLabel(sentRequest.status)}</strong>
              <p>{guestStatusText(sentRequest.status)}</p>
            </div>

            <button className="btn btn-primary" type="button" onClick={() => setSentRequest(null)}>
              Weiteren Wunsch senden
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="guest-page">
      <div className="guest-wrap">
        <div className="guest-head guest-hero">
          <div className="guest-logo guest-logo-large">🎧</div>
          <div className="guest-kicker">Spotify-Suche</div>
          <h1 className="guest-title">Musikwunsch abgeben</h1>
          <p className="guest-sub">{liveEventName}</p>
          <div className="guest-badge-wrap">
            <span className="badge badge-soft">Code: {liveEventCode}</span>
          </div>
        </div>

        <div className="guest-mini-steps">
          <div><strong>1</strong><span>Song suchen</span></div>
          <div><strong>2</strong><span>Titel wählen</span></div>
          <div><strong>3</strong><span>Status sehen</span></div>
        </div>

        {showNowPlaying && nowPlaying ? (
          <div className="guest-live-box now-playing-box">
            <div className="guest-live-icon">▶️</div>
            <div>
              <span>Jetzt läuft / zuletzt gespielt</span>
              <strong>{nowPlaying.song_title}</strong>
              <small>{nowPlaying.artist}</small>
            </div>
          </div>
        ) : null}

        {showGuestQueue ? (
          <div className="guest-live-box queue-box">
            <div className="queue-head">
              <strong>Warteliste</strong>
              <span>{guestQueue.length ? `${guestQueue.length} Wünsche` : 'Noch leer'}</span>
            </div>
            {guestQueue.length ? (
              <div className="queue-list">
                {guestQueue.map((item, index) => (
                  <div className="queue-item" key={item.id}>
                    <b>{index + 1}</b>
                    <span>
                      <strong>{item.song_title}</strong>
                      <small>{item.artist}</small>
                    </span>
                    <em>{queueStatusLabel(item.status)}</em>
                  </div>
                ))}
              </div>
            ) : <p className="queue-empty">Sei der erste Gast mit einem Musikwunsch.</p>}
          </div>
        ) : null}

        <div className="panel guest-card guest-card-pretty">
          <form className="guest-form" onSubmit={onSubmit} noValidate>
            <div>
              <label className="label">Dein Name oder Tisch <span className="required-star">*</span></label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Laura oder Tisch 4" autoComplete="name" required />
            </div>

            <div className="spotify-search-field">
              <label className="label">Song oder Interpret suchen</label>
              <input
                className="input"
                value={spotifyQuery}
                onChange={(e) => {
                  setSpotifyQuery(e.target.value);
                  clearSelectedTrack();
                }}
                placeholder="z. B. One More Time Daft Punk"
                autoComplete="off"
              />
              <p className="spotify-search-hint">Tipp: Wähle einen Spotify-Treffer aus. Du kannst Song und Interpret aber auch darunter manuell eintragen.</p>

              {spotifySearching ? <div className="spotify-search-state">Spotify sucht...</div> : null}
              {spotifySearchError ? <div className="spotify-search-error">{spotifySearchError}</div> : null}
              {spotifySuggestions.length ? (
                <div className="spotify-suggestion-list">
                  {spotifySuggestions.map((track) => (
                    <button className="spotify-suggestion" type="button" key={track.id} onClick={() => selectSpotifyTrack(track)}>
                      {track.image ? <img src={track.image} alt="" /> : <span className="spotify-suggestion-empty">🎵</span>}
                      <span>
                        <strong>{track.name}</strong>
                        <small>{track.artist}</small>
                        {track.album ? <em>{track.album}</em> : null}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedTrack ? (
              <div className="selected-track-box">
                {selectedTrack.image ? <img src={selectedTrack.image} alt="" /> : null}
                <span>
                  <small>Ausgewählt von Spotify</small>
                  <strong>{selectedTrack.name}</strong>
                  <em>{selectedTrack.artist}</em>
                </span>
                <button type="button" onClick={clearSelectedTrack}>ändern</button>
              </div>
            ) : null}

            <div>
              <label className="label">Song / Titel <span className="required-star">*</span></label>
              <input className="input" value={song} onChange={(e) => { setSong(e.target.value); clearSelectedTrack(); }} placeholder="z. B. One More Time" required />
            </div>
            <div>
              <label className="label">Interpret <span className="required-star">*</span></label>
              <input className="input" value={artist} onChange={(e) => { setArtist(e.target.value); clearSelectedTrack(); }} placeholder="z. B. Daft Punk" required />
            </div>
            <p className="guest-form-hint">Alle Felder mit * sind Pflichtfelder. Nach dem Absenden siehst du hier den Status deines Wunsches.</p>
            <button className="btn btn-primary" type="submit" disabled={sending}>{sending ? 'Wunsch wird gesendet...' : 'Wunsch absenden'}</button>
          </form>

          {error ? <div className="guest-error">{error}</div> : null}
        </div>
      </div>
    </main>
  );
}
