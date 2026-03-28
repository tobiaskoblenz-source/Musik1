'use client';

import { useState } from 'react';

export default function GuestRequestForm({ eventCode, eventName, isActive }) {
  const [name, setName] = useState('');
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSent(false);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_name: name, song_title: song, artist }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Absenden.');
        return;
      }

      setSent(true);
      setSong('');
      setArtist('');
    } catch {
      setError('Fehler beim Absenden.');
    }
  }

  return (
    <main className="guest-page">
      <div className="guest-wrap">
        <div className="guest-head">
          <div className="guest-logo">🎧</div>
          <h1 className="guest-title">Songwunsch</h1>
          <p className="guest-sub">{eventName}</p>
          <div className="guest-badge-wrap">
            <span className="badge badge-soft">Code: {eventCode}</span>
          </div>
        </div>

        <div className="panel guest-card">
          {isActive ? (
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
          ) : (
            <div className="guest-disabled">Dieses Event ist aktuell pausiert.</div>
          )}

          {sent ? <div className="guest-success">Dein Wunsch wurde abgesendet.</div> : null}
          {error ? <div className="guest-error">{error}</div> : null}
        </div>
      </div>
    </main>
  );
}
