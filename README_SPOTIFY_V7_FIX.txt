Spotify v7 Fix

Basis: v6 bleibt erhalten.

Geändert:
- Build-Version: spotify-playlist-add-items-diagnostic-2026-05-17-v7
- Playlist-Hinzufügen nutzt garantiert eine spotify:track:... URI aus der Spotify-Suche.
- Vor dem Hinzufügen werden Playlist-Details frisch von Spotify geladen.
- Fehler-Log zeigt jetzt Track-URI, Track-ID, Playlist-ID, Owner, Public, Collaborative und Token-Scopes.
- Wunsch-Buttons und Gäste-Seite EIN/AUS wurden nicht entfernt.

Test:
1. /api/spotify/debug öffnen und v7 prüfen.
2. Spotify Login bleibt wie in v5/v6.
3. Eigene öffentliche Playlist wählen.
4. + Zur Spotify Playlist testen.
