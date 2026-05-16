'use client';

import { useEffect, useState } from 'react';

export default function GuestRequestForm({ eventCode, eventName, isActive: initialIsActive }) {
  const [name, setName] = useState('');
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isActive, setIsActive] = useState(initialIsActive);
  const [liveEventName, setLiveEventName] = useState(eventName);
  const [liveEventCode, setLiveEventCode] = useState(eventCode);

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

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSent(false);

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
        body: JSON.stringify({ guest_name: name, song_title: song, artist })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Fehler beim Absenden.');
        return;
      }

      setSent(true);
      setName('');
      setSong('');
      setArtist('');
    } catch {
      setError('Fehler beim Absenden.');
    }
  }

  if (!isActive) {
    return (
      <main className="guest-page">
        <div className="guest-wrap">
          <div className="guest-head">
            <div className="guest-logo">🎧</div>
            <h1 className="guest-title">Musikwünsche</h1>
            <p className="guest-sub">{liveEventName}</p>
            <div className="guest-badge-wrap">
              <span className="badge badge-soft">Code: {liveEventCode}</span>
            </div>
          </div>

          <div className="panel guest-card">
            <div className="closed-box">
              <h2 className="closed-title">Momentan keine Musikwünsche möglich.</h2>
              <p className="closed-text">Die Gäste-Seite ist derzeit ausgeschaltet.</p>
              <p className="closed-hint">Bitte später noch einmal versuchen.</p>
            </div>
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
          <h1 className="guest-title">Songwunsch</h1>
          <p className="guest-sub">{liveEventName}</p>
          <div className="guest-badge-wrap">
            <span className="badge badge-soft">Code: {liveEventCode}</span>
          </div>
        </div>

        <div className="panel guest-card">
          <form className="guest-form" onSubmit={onSubmit}>
            <div>
              <label className="label">Dein Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Laura" />
            </div>
            <div>
              <label className="label">Song</label>
              <input className="input" value={song} onChange={(e) => setSong(e.target.value)} placeholder="z. B. Freed From Desire" />
            </div>
            <div>
              <label className="label">Artist</label>
              <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="z. B. Gala" />
            </div>
            <button className="btn btn-primary" type="submit">Wunsch absenden</button>
          </form>

          {sent ? <div className="guest-success">Dein Wunsch wurde abgesendet.</div> : null}
          {error ? <div className="guest-error">{error}</div> : null}
        </div>
      </div>
    </main>
  );
}
