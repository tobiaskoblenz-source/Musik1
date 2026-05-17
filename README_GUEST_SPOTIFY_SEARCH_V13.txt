DJ Wunsch App v13 - Gäste-Seite mit Spotify-Suche

Neu:
- Gäste können Song oder Interpret suchen.
- Spotify-Vorschläge werden mit Cover, Titel, Artist und Album angezeigt.
- Ausgewählte Tracks speichern Track-ID, Track-URI, Spotify-Link und Cover im Wunsch.
- Dashboard nutzt diese gespeicherte Track-URI für Spotify öffnen und Playlist hinzufügen.
- Manuelles Absenden bleibt weiterhin möglich, falls Spotify-Suche nicht verfügbar ist.

Wichtig für Railway:
Für die öffentliche Gäste-Suche braucht der Server zusätzlich den Spotify Client Secret:
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...

Bestehende Variablen bleiben:
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=...
NEXT_PUBLIC_SPOTIFY_SCOPES=user-read-private playlist-read-private playlist-modify-public playlist-modify-private
APP_URL=https://musik1-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://musik1-production.up.railway.app

Nicht entfernt:
- Spotify Login/Logout bleibt
- Spotify Playlist bleibt
- Wunsch-Buttons bleiben
- Gäste-Seite EIN/AUS bleibt
- Zu Spotify = Angenommen + rot bleibt
