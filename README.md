# DJ Wunsch App - Spotify + Fehler-Log

Diese Version baut auf der funktionierenden Basis auf:

- DashboardClient.js repariert
- GuestRequestForm.js repariert
- Wunsch-Buttons bleiben erhalten
- Gäste-Seite EIN/AUS bleibt erhalten

Neu:

- Fehler-Log als eigene Ansicht im Dashboard
- Spotify-Seite als eigene Ansicht im Dashboard
- Spotify Login und Logout als separate Buttons
- Öffentliche Spotify Playlists laden
- Wunsch zu öffentlicher Spotify Playlist hinzufügen
- Spotify Track öffnen

## Railway Variables

Bei Railway unter Variables eintragen:

```txt
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=deine_echte_spotify_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://DEINE-APP.up.railway.app/api/spotify/callback
NEXT_PUBLIC_SPOTIFY_SCOPES=user-read-private playlist-read-private playlist-modify-public
```

## Spotify Developer Dashboard

In deiner Spotify App unter Redirect URIs exakt eintragen:

```txt
https://DEINE-APP.up.railway.app/api/spotify/callback
```

Nur öffentliche Playlists werden benutzt. Private Playlists sind bewusst nicht eingebaut.
