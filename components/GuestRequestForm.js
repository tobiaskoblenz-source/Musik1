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

export default function GuestRequestForm({ eventCode, eventName, isActive: initialIsActive }) {
  const [name, setName] = useState('');
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [sentRequest, setSentRequest] = useState(null);
  const [error, setError] = useState('');
  const [isActive, setIsActive] = useState(initialIsActive);
  const [liveEventName, setLiveEventName] = useState(eventName);
  const [liveEventCode, setLiveEventCode] = useState(eventCode);
  const [sending, setSending] = useState(false);

  const cleanName = useMemo(() => name.trim(), [name]);
  const cleanSong = useMemo(() => song.trim(), [song]);
  const cleanArtist = useMemo(() => artist.trim(), [artist]);

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

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!cleanName || !cleanSong || !cleanArtist) {
      setError('Bitte Name, Song und Interpret ausfüllen.');
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
        body: JSON.stringify({ guest_name: cleanName, song_title: cleanSong, artist: cleanArtist })
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
        status: 'open'
      });
      setName('');
      setSong('');
      setArtist('');
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
          <div className="guest-head">
            <div className="guest-logo">🎧</div>
            <h1 className="guest-title">Musikwünsche pausiert</h1>
            <p className="guest-sub">{liveEventName}</p>
            <div className="guest-badge-wrap">
              <span className="badge badge-soft">Code: {liveEventCode}</span>
            </div>
          </div>

          <div className="panel guest-card">
            <div className="closed-box">
              <div className="closed-icon">⏸️</div>
              <h2 className="closed-title">Der DJ nimmt gerade keine Wünsche an.</h2>
              <p className="closed-text">Die Gäste-Seite ist aktuell ausgeschaltet.</p>
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
          <div className="guest-head">
            <div className="guest-logo">✅</div>
            <h1 className="guest-title">Danke für deinen Musikwunsch</h1>
            <p className="guest-sub">{liveEventName}</p>
            <div className="guest-badge-wrap">
              <span className="badge badge-soft">Code: {liveEventCode}</span>
            </div>
          </div>

          <div className="panel guest-card thanks-card">
            <div className="thanks-icon">🎶</div>
            <h2 className="thanks-title">Dein Wunsch ist beim DJ angekommen.</h2>
            <div className="guest-request-summary">
              <strong>{sentRequest.song_title}</strong>
              <span>{sentRequest.artist}</span>
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
        <div className="guest-head">
          <div className="guest-logo">🎧</div>
          <h1 className="guest-title">Musikwunsch abgeben</h1>
          <p className="guest-sub">{liveEventName}</p>
          <div className="guest-badge-wrap">
            <span className="badge badge-soft">Code: {liveEventCode}</span>
          </div>
        </div>

        <div className="panel guest-card">
          <form className="guest-form" onSubmit={onSubmit} noValidate>
            <div>
              <label className="label">Dein Name oder Tisch <span className="required-star">*</span></label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Laura oder Tisch 4" autoComplete="name" required />
            </div>
            <div>
              <label className="label">Song / Titel <span className="required-star">*</span></label>
              <input className="input" value={song} onChange={(e) => setSong(e.target.value)} placeholder="z. B. One More Time" required />
            </div>
            <div>
              <label className="label">Interpret <span className="required-star">*</span></label>
              <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="z. B. Daft Punk" required />
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
