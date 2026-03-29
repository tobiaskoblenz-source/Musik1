'use client';

import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

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
  const [eventName, setEventName] = useState(initialEvent?.name || 'Birthday Bash @ Club Room');
  const [eventCode, setEventCode] = useState(initialEvent?.code || 'PARTY-2026');
  const [guestLimit, setGuestLimit] = useState('3 pro Gast');
  const [eventStatus, setEventStatus] = useState(initialEvent?.isActive ? 'Aktiv' : 'Pausiert');

  const guestUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/e/${eventCode}`
      : `http://localhost:3000/e/${eventCode}`;

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
          setEventStatus(data.event.isActive ? 'Aktiv' : 'Pausiert');
        }
      } catch {}
    }

    loadRequests();
    loadEvent();
    const interval = setInterval(loadRequests, 1500);
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
  }), [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => (filter === 'all' ? true : r.status === filter))
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [r.song_title, r.artist, r.guest_name].some((v) => v.toLowerCase().includes(q));
      });
  }, [requests, search, filter]);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 1500);
  }

  async function onStatusChange(id, status) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch {}
  }

  async function onDelete(id) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch('/api/requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      flash('Wunsch entfernt');
    } catch {
      flash('Entfernen fehlgeschlagen');
    }
  }


  async function copyLink() {
    try {
      await navigator.clipboard.writeText(guestUrl);
      flash('Gast-Link kopiert');
    } catch {
      flash('Kopieren nicht möglich');
    }
  }

  function downloadQr() {
    const canvas = document.querySelector('#qr-box canvas');
    if (!canvas) {
      flash('QR-Code nicht gefunden');
      return;
    }
    const link = document.createElement('a');
    link.download = `${eventCode}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    flash('QR-Code gespeichert');
  }

  async function saveEvent() {
    try {
      await fetch('/api/event', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventName,
          code: eventCode,
          isActive: eventStatus === 'Aktiv',
        }),
      });
      flash('Event gespeichert');
    } catch {
      flash('Speichern fehlgeschlagen');
    }
  }

  function toggleEvent() {
    setEventStatus((prev) => (prev === 'Aktiv' ? 'Pausiert' : 'Aktiv'));
  }

  return (
    <main className="page-shell">
      <div className="topbar">
        <div className="topbar-left">
          <div className="logo-box">🎧</div>
          <div>
            <h1 className="page-title">DJ Dashboard</h1>
            <p className="page-subtitle">{eventName}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => flash('QR ist rechts sichtbar')}>QR anzeigen</button>
          <button className="btn btn-primary" onClick={copyLink}>Gast-Link kopieren</button>
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
              <span className="badge badge-soft">Lokal</span>
            </div>
            <div className="field-grid">
              <div className="full">
                <label className="label">Eventname</label>
                <input className="input" value={eventName} onChange={(e) => setEventName(e.target.value)} />
              </div>
              <div>
                <label className="label">Event-Code</label>
                <input className="input" value={eventCode} onChange={(e) => setEventCode(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="label">Status</label>
                <input className="input" value={eventStatus} onChange={(e) => setEventStatus(e.target.value)} />
              </div>
              <div className="full">
                <label className="label">Limit für Gäste</label>
                <input className="input" value={guestLimit} onChange={(e) => setGuestLimit(e.target.value)} />
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
                      <h3 className="request-title" style={{display:'inline-block', marginRight: 8}}>{item.song_title}</h3>
                      <span className={badgeClass(item.status)}>{item.status === 'open' ? 'LIVE / OFFEN' : item.status}</span>
                    </div>
                    <div className="request-meta">{item.artist}</div>
                    <div className="request-submeta">von {item.guest_name} · {item.created_at}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="request-id">#{item.id}</div>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onDelete(item.id)}
                      style={{ width: 38, minWidth: 38, height: 38, padding: 0, borderRadius: 14 }}
                      aria-label="Wunsch entfernen"
                      title="Wunsch entfernen"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="request-actions">
                  <button className="btn btn-secondary" onClick={() => onStatusChange(item.id, 'accepted')}>Annehmen</button>
                  <button className="btn btn-secondary" onClick={() => onStatusChange(item.id, 'played')}>Gespielt</button>
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
              <span className="badge badge-soft">{eventStatus}</span>
            </div>
            <div className="info-list">
              <div className="info-row"><span>Event-Code</span><span>{eventCode}</span></div>
              <div className="info-row"><span>Offene Limits</span><span>{guestLimit}</span></div>
              <div className="info-row"><span>Link</span><span>/e/{eventCode}</span></div>
            </div>
          </div>

          <div className="panel panel-pad">
            <h2 className="section-title">QR & Zugang</h2>
            <div className="qr-box">
              <div id="qr-box" style={{ background: 'white', width: 190, height: 190, margin: '0 auto', borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
                <QRCodeCanvas value={guestUrl} size={160} includeMargin={true} />
              </div>
              <div className="qr-note">{guestUrl}</div>
              <div className="row-2">
                <button className="btn btn-secondary" onClick={copyLink}>Link kopieren</button>
                <button className="btn btn-primary" onClick={downloadQr}>QR speichern</button>
              </div>
            </div>
          </div>

          <div className="panel panel-pad">
            <h2 className="section-title">Bearbeiten & Aktionen</h2>
            <div className="side-actions">
              <button className="btn btn-primary btn-block" onClick={saveEvent}>Event speichern</button>
              <button className="btn btn-secondary btn-block" onClick={toggleEvent}>{eventStatus === 'Aktiv' ? 'Event pausieren' : 'Event aktivieren'}</button>
              <button className="btn btn-secondary btn-block" onClick={() => setEventCode(`PARTY-${Math.floor(1000 + Math.random() * 9000)}`)}>Gast-Link ändern</button>
              <button className="btn btn-secondary btn-block" onClick={() => flash('Gäste-Limit geändert')}>Gäste-Limit ändern</button>
              <button className="btn btn-secondary btn-block" onClick={() => flash('Export Demo')}>Wünsche exportieren</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
