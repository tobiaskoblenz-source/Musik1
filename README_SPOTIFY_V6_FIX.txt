# Spotify Playlist Fix v6

Version: spotify-playlist-owner-scope-fix-2026-05-17-v6

Geändert:
- Spotify Login bleibt wie v5 funktionierend.
- Playlists werden jetzt nur noch angezeigt, wenn sie öffentlich UND dem eingeloggten Spotify-Konto gehören oder collaborative sind.
- Token-Scopes werden auf der Spotify-Seite angezeigt.
- Vor dem Hinzufügen wird geprüft, ob playlist-modify-public wirklich im Token vorhanden ist.
- Button zum Erstellen einer neuen öffentlichen Playlist hinzugefügt.
- Fehler-Log zeigt Playlist Owner, Public, Collaborative und Token-Scopes.

Wichtig:
- Bei Spotify Developer bleibt Redirect URI: https://musik1-production.up.railway.app/api/spotify/callback
- Railway Scopes: user-read-private playlist-read-private playlist-modify-public playlist-modify-private
