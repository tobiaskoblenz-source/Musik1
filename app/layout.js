import './globals.css';

export const metadata = {
  title: 'DJ App Spotify Clean',
  description: 'DJ Wunsch App mit Gäste-Seite EIN/AUS und sauberem Spotify-Bereich'
};

export default function RootLayout({ children }) {
  return <html lang="de"><body>{children}</body></html>;
}
