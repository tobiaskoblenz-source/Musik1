# First Style Local DJ App

Lokale Version im Stil der ersten App-Datei, aber ohne Supabase und ohne Deploy.

## Start
```bash
npm install
npm run dev
```

Dann öffnen:
- http://localhost:3000
- http://localhost:3000/dashboard
- http://localhost:3000/e/PARTY-2026
- http://localhost:3000/login


## Mit QR-Code
Im Dashboard wird rechts ein echter QR-Code für den Gäste-Link angezeigt.


## QR speichern
Im Dashboard gibt es rechts den Button **QR speichern**. Damit wird der QR-Code als PNG heruntergeladen.


## Wünsche im Dashboard
Diese Version sendet Wünsche lokal an eine kleine API im laufenden Server-Speicher. Solange `npm run dev` läuft, erscheinen neue Wünsche im Dashboard.


## Wünsche entfernen
Im Dashboard hat jede Wunschkarte oben rechts ein **X**, um den Eintrag direkt zu löschen.
