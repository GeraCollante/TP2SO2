# Odin vikingo (APK)

Rama `odin-apk`: el juego de cartas **Odin** como app de Android, con modo **Bluetooth** para jugar
entre celulares cercanos sin internet (Google Nearby Connections: Bluetooth + WiFi directo).

- `game/odin.html` — el juego (el mismo de la versión web).
- `game/nearby.js` — adaptador que conecta el modo multijugador con el Bluetooth.
- `android/app/src/main/java/com/geracollante/odin/OdinNearbyPlugin.java` — plugin nativo de Nearby.
- `scripts/build-www.mjs` — arma `www/` con fuentes locales para que funcione sin internet.

Cada push a esta rama compila el APK en GitHub Actions y lo publica en **Releases**.
