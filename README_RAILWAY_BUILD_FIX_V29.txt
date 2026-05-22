Railway Build Fix v29

Problem im Log:
npm error Exit handler never called!
Das ist ein npm/Node-Installationsproblem beim Railway-Build, nicht die App-Funktion selbst.

Fix in dieser ZIP:
- Node auf 20.x festgelegt (.nvmrc, .node-version, package.json engines)
- npm auf 10.x festgelegt
- package-lock Registry-URLs auf öffentliche npm Registry korrigiert
- App-Code von v28 bleibt unverändert

Nach Upload:
1. GitHub-Dateien komplett ersetzen
2. Commit machen
3. Railway Redeploy
4. Debug prüfen: /api/spotify/debug
Version: railway-node20-npm-fix-2026-05-22-v29
