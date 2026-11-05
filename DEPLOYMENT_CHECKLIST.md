# Producción: API de Madrid Urban Intelligence

La aplicación usa Vercel para `dmiyc.com` y Render para FastAPI. El frontend se
compila con `NEXT_PUBLIC_API_URL=https://api.dmiyc.com/api`.

## Configuración externa necesaria

1. Añadir `api.dmiyc.com` como dominio personalizado del servicio
   `madrid-urban-intelligence-api` en Render.
2. En Cloudflare, crear el CNAME que Render indique para `api.dmiyc.com` y dejarlo
   inicialmente como **DNS only** mientras Render valida el certificado.
3. Cuando Render muestre el dominio como verificado, activar el proxy de Cloudflare
   únicamente si el CNAME ya no genera Error 1000; SSL/TLS debe estar en `Full
   (strict)`.
4. Configurar en Vercel la variable de producción
   `NEXT_PUBLIC_API_URL=https://api.dmiyc.com/api` y redeplegar el frontend.
5. Confirmar que Render mantiene `ALLOWED_ORIGINS` con `https://dmiyc.com`,
   `https://www.dmiyc.com` y los previews de Vercel.

## Verificación posterior al despliegue

Comprobar HTTP 200 en:

- `https://api.dmiyc.com/api/health`
- `https://api.dmiyc.com/api/filters`
- `https://api.dmiyc.com/api/kpis?year=2026&month=Junio&op=alquiler`

Después, abrir `/madrid`, `/madrid/chat` y `/madrid/veredicto`. El dashboard debe
mostrar el último periodo proporcionado por `/api/filters`, y los fallos de API
deben enseñar una opción de reintento en lugar de métricas de cero engañosas.
