import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-shell">
      <div className="home-card">
        <h1 className="hero-title">Private DJ-Wunsch-App</h1>
        <p className="hero-sub">Lokale Version im Stil der ersten App. Ohne Supabase, ohne Login, ohne Deploy-Stress.</p>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn btn-primary">Dashboard öffnen</Link>
          <Link href="/e/PARTY-2026" className="btn btn-secondary">Gast-Seite</Link>
          <Link href="/login" className="btn btn-ghost">Login Demo</Link>
        </div>
      </div>
    </main>
  );
}
