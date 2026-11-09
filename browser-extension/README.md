# Importador de anuncios DMIYC

Extensión Manifest V3 para Chrome/Edge. Lee datos visibles del anuncio que el usuario ya ha abierto en Idealista, Fotocasa, Habitaclia o Pisos.com y abre DMIYC con los datos pre-rellenados.

## Instalación local

1. Abre `chrome://extensions` o `edge://extensions`.
2. Activa **Modo desarrollador**.
3. Pulsa **Cargar descomprimida**.
4. Selecciona esta carpeta `browser-extension`.
5. Abre un anuncio permitido, espera a que cargue y pulsa **Importar en DMIYC**.

## Alcance

- Solo lee la pestaña que el usuario ha abierto.
- No evade CAPTCHA, antibots, WAF, login ni restricciones del portal.
- No envía cookies ni credenciales a DMIYC.
- Para probar localmente, cambia `TARGET_APP` en `content.js` a `http://localhost:3000/madrid/veredicto`.
