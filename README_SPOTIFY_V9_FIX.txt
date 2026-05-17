Spotify v9 Fix
===============
Build-Version: spotify-scope-private-permission-fix-2026-05-17-v9

Änderung:
- Spotify Login fordert jetzt zusätzlich playlist-modify-private an.
- Die App zeigt und nutzt weiterhin nur eigene öffentliche Playlists.
- Das Zusatzrecht ist nur ein technischer Fix gegen Spotify 403 "Insufficient client scope" bei bestimmten Playlists/Accounts.
- Nach Upload unbedingt Spotify Logout und Login neu machen.

Railway Variable:
NEXT_PUBLIC_SPOTIFY_SCOPES=user-read-private playlist-read-private playlist-modify-public playlist-modify-private

Spotify Redirect URI:
https://musik1-production.up.railway.app/api/spotify/callback
