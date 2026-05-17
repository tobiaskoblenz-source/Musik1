Spotify v5 Fix

Wichtigste Änderung:
- /api/spotify/callback tauscht den Spotify-Code nicht mehr serverseitig aus.
- Die Route leitet den code nur auf https://musik1-production.up.railway.app/spotify/callback weiter.
- /spotify/callback macht den Token-Tausch im Browser mit dem Code-Verifier aus localStorage.

Damit verschwindet der Fehler:
- Spotify Code Verifier Cookie fehlt
- Weiterleitung auf https://localhost:8080/spotify/callback

Spotify Developer Redirect URI:
https://musik1-production.up.railway.app/api/spotify/callback

Railway Variables:
APP_URL=https://musik1-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://musik1-production.up.railway.app
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=deine Client ID
NEXT_PUBLIC_SPOTIFY_SCOPES=user-read-private playlist-read-private playlist-modify-public playlist-modify-private
