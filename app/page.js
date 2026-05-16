import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-shell">
      <div className="home-card">
        <h1 className="hero-title">Private DJ-Wunsch-App</h1>
        <p className="hero-sub">Version mit Gäste-Seite EIN/AUS und sauberem Spotify-Bereich.</p>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn btn-primary">Dashboard öffnen</Link>
          <Link href="/e/TANZ" className="btn btn-secondary">Gast-Seite</Link>
        </div>
      </div>
    </main>
  );
}
