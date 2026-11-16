import { NextRequest, NextResponse } from 'next/server';
import { NOTICE_MAX_AGE_MS, NOTICE_MAX_AGE_SECONDS, NOTICE_STORAGE_KEY, POLICY_VERSION } from '../../../lib/privacy-notice';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid acceptance payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid acceptance payload' }, { status: 400 });
  }

  const acceptance = body as { accepted?: unknown; at?: unknown; policyVersion?: unknown };
  const acceptedAt = typeof acceptance.at === 'string' ? Date.parse(acceptance.at) : NaN;
  const age = Date.now() - acceptedAt;
  if (
    acceptance.accepted !== true ||
    acceptance.policyVersion !== POLICY_VERSION ||
    !Number.isFinite(acceptedAt) ||
    age < 0 ||
    age > NOTICE_MAX_AGE_MS
  ) {
    return NextResponse.json({ error: 'Invalid acceptance payload' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  const hostname = request.nextUrl.hostname.toLowerCase();
  const sharedDomain = hostname === 'dmiyc.com' || hostname === 'www.dmiyc.com' ? '.dmiyc.com' : undefined;
  response.cookies.set(NOTICE_STORAGE_KEY, JSON.stringify({
    accepted: true,
    at: new Date(acceptedAt).toISOString(),
    policyVersion: POLICY_VERSION,
  }), {
    maxAge: NOTICE_MAX_AGE_SECONDS,
    path: '/',
    domain: sharedDomain,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    httpOnly: false,
  });

  return response;
}
