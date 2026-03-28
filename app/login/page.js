'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setMessage(`Login-Link Demo für: ${email}`);
  }

  return (
    <main className="home-shell">
      <div className="home-card">
        <h1 className="hero-title">Login Demo</h1>
        <p className="hero-sub">Einfache lokale Variante ohne echtes Auth-System.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail" />
          <button className="btn btn-primary" type="submit">Login-Link senden</button>
        </form>
        {message ? <div className="notice" style={{ marginTop: 18 }}>{message}</div> : null}
      </div>
    </main>
  );
}
