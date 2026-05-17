# Spotify Playlist Items Endpoint Fix v8

Build-Version: spotify-playlist-items-endpoint-fix-2026-05-17-v8

Änderung:
- Spotify Login bleibt auf der funktionierenden v5/v6/v7-Basis.
- Gäste-Seite EIN/AUS bleibt unverändert.
- Wunsch-Buttons bleiben unverändert.
- Playlist-Hinzufügen nutzt jetzt den neuen Endpoint:
  POST https://api.spotify.com/v1/playlists/{playlist_id}/items
- Der alte Endpoint /tracks wird nicht mehr benutzt.
- Track-URI bleibt im Fehler-Log sichtbar.

Nach Deploy prüfen:
https://musik1-production.up.railway.app/api/spotify/debug

Dort muss stehen:
buildVersion = spotify-playlist-items-endpoint-fix-2026-05-17-v8
