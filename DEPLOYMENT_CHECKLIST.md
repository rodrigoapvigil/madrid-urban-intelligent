# Producción: API de Madrid Urban Intelligence

La aplicación usa Vercel para `dmiyc.com` y Render para FastAPI. El frontend se
compila con `NEXT_PUBLIC_API_URL=https://api.dmiyc.com/api`.

## Configuración externa necesaria

1. El servicio existente `madrid-urban-api` debe usar la raíz del repositorio como
   directorio de ejecución. El manifiesto instala `backend/requirements.txt` y
   arranca con `uvicorn backend.main:app`; así Python resuelve el paquete `backend`
   y la API puede leer `data/`.
2. Añadir `api.dmiyc.com` como dominio personalizado del servicio en Render.
3. En Cloudflare, crear el CNAME que Render indique para `api.dmiyc.com` y dejarlo
   inicialmente como **DNS only** mientras Render valida el certificado.
4. Cuando Render muestre el dominio como verificado, activar el proxy de Cloudflare
   únicamente si el CNAME ya no genera Error 1000; SSL/TLS debe estar en `Full
   (strict)`.
5. Configurar en Vercel la variable de producción
   `NEXT_PUBLIC_API_URL=https://api.dmiyc.com/api` y redeplegar el frontend.
6. Confirmar que Render mantiene `ALLOWED_ORIGINS` con `https://dmiyc.com`,
   `https://www.dmiyc.com` y los previews de Vercel.

## Verificación posterior al despliegue

Comprobar HTTP 200 en:

- `https://api.dmiyc.com/api/health`
- `https://api.dmiyc.com/api/filters`
- `https://api.dmiyc.com/api/kpis?year=2026&month=Junio&op=alquiler`

En `/api/health`, comprobar además `database_available: true`. Si falta la base
de datos, el endpoint devuelve HTTP 503 para que Render no marque como sano un
despliegue sin datos.

Después, abrir `/madrid`, `/madrid/chat` y `/madrid/veredicto`. El dashboard debe
mostrar el último periodo proporcionado por `/api/filters`, y los fallos de API
deben enseñar una opción de reintento en lugar de métricas de cero engañosas.
