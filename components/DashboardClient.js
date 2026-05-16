'use client';

import { useEffect, useMemo, useState } from 'react';

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

export default function DashboardClient({ initialRequests = [], initialEvent }) {
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [eventName, setEventName] = useState(initialEvent?.name || 'TANZ');
  const [eventCode, setEventCode] = useState(initialEvent?.code || 'TANZ');
  const [guestPageStatus, setGuestPageStatus] = useState(initialEvent?.isActive ? 'EIN' : 'AUS');

  useEffect(() => {
    let stopped = false;

    async function loadRequests() {
      try {
        const res = await fetch('/api/requests', { cache: 'no-store' });
        const data = await res.json();
        if (!stopped && data.requests) setRequests(data.requests);
      } catch {}
    }

    async function loadEvent() {
      try {
        const res = await fetch('/api/event', { cache: 'no-store' });
        const data = await res.json();
        if (!stopped && data.event) {
          setEventName(data.event.name);
          setEventCode(data.event.code);
          setGuestPageStatus(data.event.isActive ? 'EIN' : 'AUS');
        }
      } catch {}
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
        return [r.song_title, r.artist, r.guest_name].some((v) => v.toLowerCase().includes(q));
      });
  }, [requests, search, filter]);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 1600);
  }

  async function onStatusChange(id, status) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
    } catch {}
  }

  async function onDelete(id) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch('/api/requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      flash('Wunsch entfernt');
    } catch {
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
      if (!res.ok) throw new Error();
      flash(`Gäste-Seite: ${nextStatus}`);
    } catch {
      flash('Speichern fehlgeschlagen');
    }
  }

  function toggleGuestPage() {
    const nextStatus = guestPageStatus === 'EIN' ? 'AUS' : 'EIN';
    setGuestPageStatus(nextStatus);
    saveEvent(nextStatus, eventName, eventCode);
  }

  return (
    <main className="page-shell">
      <div className="topbar">
        <div className="topbar-left">
          <div className="logo-box">🎧</div>
          <div>
            <h1 className="page-title">DJ Dashboard + Spotify</h1>
            <p className="page-subtitle">{eventName}</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => flash('Spotify-Bereich ist rechts sichtbar')}>Spotify anzeigen</button>
        </div>
      </div>

      {notice ? <div className="notice">{notice}</div> : null}

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
              <span className="badge badge-soft">Spotify aktiv</span>
            </div>

            <div className="field-grid">
              <div className="full">
                <label className="label">Eventname</label>
                <input
                  className="input"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  onBlur={() => saveEvent(guestPageStatus, eventName, eventCode)}
                />
              </div>
              <div>
                <label className="label">Event-Code</label>
                <input
                  className="input"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  onBlur={() => saveEvent(guestPageStatus, eventName, eventCode)}
                />
              </div>
              <div>
                <label className="label">Gäste-Seite</label>
                <input className="input" value={guestPageStatus} readOnly />
              </div>
            </div>
          </div>

          <div className="panel panel-pad">
            <div className="toolbar">
              <input
                className="input"
                placeholder="Suche nach Song, Artist oder Gast"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                      <span className={badgeClass(item.status)}>{item.status === 'open' ? 'LIVE / OFFEN' : item.status}</span>
                    </div>
                    <div className="request-meta">{item.artist}</div>
                    <div className="request-submeta">von {item.guest_name} · {item.created_at}</div>
                    <div className="request-submeta" style={{ marginTop: 12, color: 'rgba(110,231,183,.9)' }}>Spotify: Platzhalter aktiv</div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="request-id">#{item.id}</div>
                    <button className="btn btn-secondary" onClick={() => onDelete(item.id)} style={{ width: 38, minWidth: 38, height: 38, padding: 0, borderRadius: 14 }} aria-label="Wunsch entfernen" title="Wunsch entfernen">×</button>
                  </div>
                </div>

                <div className="request-actions">
                  <button className="btn btn-secondary" onClick={() => onStatusChange(item.id, 'accepted')}>Annehmen</button>
                  <button className="btn btn-secondary" onClick={() => onStatusChange(item.id, 'played')}>Gespielt</button>
                  <button className="btn btn-secondary" onClick={() => flash('Spotify-Übergabe kommt als Nächstes')}>Zu Spotify</button>
                  <button className="btn btn-secondary" onClick={() => flash('Spotify öffnen kommt als Nächstes')}>Spotify öffnen</button>
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
              <div className="info-row"><span>Status</span><span>Nicht verbunden</span></div>
              <div className="info-row"><span>Playlist</span><span>TANZ</span></div>
              <div className="info-row"><span>Modus</span><span>Auto bei Annehmen</span></div>
            </div>

            <div className="stack" style={{ gap: 10, marginTop: 14 }}>
              <button className="btn btn-primary btn-block" onClick={() => flash('Mit Spotify verbinden kommt als Nächstes')}>
                Mit Spotify verbinden
              </button>
              <button className="btn btn-secondary btn-block" onClick={() => flash('Playlist wählen kommt als Nächstes')}>
                Playlist wählen
              </button>
              <button className="btn btn-secondary btn-block" onClick={() => flash('Spotify öffnen kommt als Nächstes')}>
                Spotify öffnen
              </button>
            </div>
          </div>

          <div className="panel panel-pad">
            <h2 className="section-title">Playlist Vorschau</h2>

            <div className="info-list" style={{ marginTop: 16 }}>
              <div className="info-row"><span>1</span><span>Titanium</span></div>
              <div className="info-row"><span>2</span><span>Levels</span></div>
              <div className="info-row"><span>3</span><span>Mr. Brightside</span></div>
              <div className="info-row"><span>4</span><span>One More Time</span></div>
            </div>

            <div className="stack" style={{ gap: 10, marginTop: 14 }}>
              <button className="btn btn-secondary btn-block" onClick={() => flash('Playlist öffnen kommt als Nächstes')}>
                Playlist in Spotify öffnen
              </button>
            </div>
          </div>

          <div className="panel panel-pad">
            <h2 className="section-title">Treffer prüfen</h2>

            <div className="info-list" style={{ marginTop: 16 }}>
              <div className="info-row"><span style={{ maxWidth: '70%' }}>David Guetta feat. Sia – Titanium</span><button className="btn btn-secondary" onClick={() => flash('Treffer-Auswahl kommt als Nächstes')}>Übernehmen</button></div>
              <div className="info-row"><span style={{ maxWidth: '70%' }}>Titanium - Live Version</span><button className="btn btn-secondary" onClick={() => flash('Treffer-Auswahl kommt als Nächstes')}>Übernehmen</button></div>
              <div className="info-row"><span style={{ maxWidth: '70%' }}>Titanium - Remix</span><button className="btn btn-secondary" onClick={() => flash('Treffer-Auswahl kommt als Nächstes')}>Übernehmen</button></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
