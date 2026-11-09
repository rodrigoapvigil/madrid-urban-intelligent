# Auditoría de superficies legales — DMIYC

Fecha de revisión: 9 de noviembre de 2026.

## Cubierto en el frontend

- `/aviso-legal`, `/privacidad` y `/cookies` existen y están enlazadas desde el footer.
- El frontend no contiene Google Analytics, píxeles publicitarios, Mapbox, OpenStreetMap, Carto ni escritura directa de cookies.
- Se carga Google Fonts y se consulta la API de `madrid-urban-api.onrender.com`; ambas conexiones deben figurar en la información de privacidad.
- Se añadió un aviso visible de tecnologías necesarias. No es un banner de consentimiento publicitario: actualmente no se cargan tecnologías opcionales.

## Bloqueos antes de publicarlo como cumplimiento cerrado

1. Completar en el aviso legal y la privacidad el domicilio o residencia del titular y, si existe actividad económica, la identificación fiscal y los datos registrales que correspondan.
2. Verificar con los paneles de Vercel, Render y cualquier proveedor de correo los encargados, regiones, transferencias internacionales, acuerdos de tratamiento y plazos reales de logs.
3. Confirmar en producción las cookies y el almacenamiento con un navegador limpio. Si se añade analítica, publicidad, mapas de terceros, pagos o herramientas de soporte, deben bloquearse hasta obtener consentimiento previo y actualizar el inventario.
4. Confirmar el flujo real del chat, El Veredicto y el campo de renta: qué datos llegan a la API, cuánto tiempo se guardan, qué logs conservan los proveedores y si se usan para entrenamiento o perfilado.
5. Mantener un registro de actividades, análisis de riesgos, contratos con encargados y procedimiento de brechas; la web por sí sola no sustituye estas obligaciones.

Este documento es una lista técnica de verificación, no asesoramiento jurídico. Antes de explotar el servicio comercialmente, debe revisarlo un profesional que conozca la identidad del titular, los contratos de infraestructura y el tratamiento real.
