import './globals.css';

export const metadata = {
  title: 'DJ Request App Local',
  description: 'Lokale Version ohne Supabase'
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
