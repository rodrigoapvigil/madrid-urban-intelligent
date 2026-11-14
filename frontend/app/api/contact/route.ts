import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 12_000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const allowedReasons = new Set([
  'Colaboración',
  'Prensa y medios',
  'Datos y metodología',
  'Sugerencia o error',
]);

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

function getClientIp(request: NextRequest) {
  return request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

function isRateLimited(ip: string, now: number) {
  rateLimits.forEach((entry, key) => {
    if (entry.resetAt <= now) rateLimits.delete(key);
  });

  if (rateLimits.size >= 5_000 && !rateLimits.has(ip)) {
    const oldestKey = rateLimits.keys().next().value;
    if (oldestKey) rateLimits.delete(oldestKey);
  }

  const entry = rateLimits.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count += 1;
  return false;
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return jsonError('Origen no permitido.', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) return jsonError('El mensaje es demasiado largo.', 413);

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return jsonError('No se pudo leer la solicitud.', 400);
  }
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
    return jsonError('El mensaje es demasiado largo.', 413);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return jsonError('La solicitud no tiene un formato válido.', 400);
  }

  const ip = getClientIp(request);
  const now = Date.now();
  if (isRateLimited(ip, now)) {
    const resetAt = rateLimits.get(ip)?.resetAt ?? now + RATE_WINDOW_MS;
    return jsonError('Has enviado varios mensajes. Inténtalo de nuevo más tarde.', 429, {
      'Retry-After': String(Math.max(1, Math.ceil((resetAt - now) / 1000))),
    });
  }

  // Un honeypot cumplimentado se acepta silenciosamente y no se reenvía.
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const valid = isText(body.name, 120)
    && isText(body.email, 254)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    && (body.organization === '' || (typeof body.organization === 'string' && body.organization.length <= 160))
    && typeof body.reason === 'string'
    && allowedReasons.has(body.reason)
    && isText(body.message, 8_000)
    && body.privacyAccepted === true;
  if (!valid) return jsonError('Revisa los campos del formulario e inténtalo de nuevo.', 400);
  const contact = body as {
    name: string;
    email: string;
    organization: string;
    reason: string;
    message: string;
  };

  const endpoint = process.env.CONTACT_ENDPOINT?.trim();
  if (!endpoint) return jsonError('El envío de contacto no está configurado.', 503);
  const recipient = process.env.CONTACT_TO?.trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return jsonError('El destinatario de contacto no está configurado.', 503);
  }

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    return jsonError('El envío de contacto no está configurado correctamente.', 503);
  }
  if (endpointUrl.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && endpointUrl.hostname === 'localhost' && endpointUrl.protocol === 'http:')) {
    return jsonError('El endpoint de contacto debe usar HTTPS.', 503);
  }

  try {
    const name = contact.name.trim();
    const email = contact.email.trim();
    const organization = contact.organization.trim();
    const message = contact.message.trim();
    const subject = `${contact.reason} | DMIYC | Nuevo mensaje de ${name}`;
    const text = [
      `Motivo: ${contact.reason}`,
      `Nombre: ${name}`,
      `Email: ${email}`,
      'Mensaje:',
      message,
      ...(organization ? [`Organización: ${organization}`] : []),
      '',
      'Origen: formulario de contacto de DMIYC (Decide Madrid: Invierte y Compra).',
    ].join('\n');

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient,
        fromName: 'DMIYC · Decide Madrid: Invierte y Compra',
        replyTo: email,
        subject,
        text,
        name,
        email,
        organization,
        reason: contact.reason,
        message,
        privacyAccepted: true,
        source: 'DMIYC — Decide Madrid: Invierte y Compra',
      }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!response.ok) return jsonError('El servicio de contacto no pudo recibir el mensaje.', 502);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError('No se pudo conectar con el servicio de contacto.', 502);
  }
}
