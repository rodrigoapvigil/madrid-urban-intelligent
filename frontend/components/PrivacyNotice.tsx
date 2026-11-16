'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LEGACY_DISMISSAL_KEY,
  NOTICE_STORAGE_KEY,
  POLICY_VERSION,
  isValidNoticeAcceptance,
  type NoticeAcceptance,
} from '../lib/privacy-notice';

function readCookieAcceptance(): NoticeAcceptance | null {
  try {
    const cookie = document.cookie.split('; ').find(part => part.startsWith(`${NOTICE_STORAGE_KEY}=`));
    if (!cookie) return null;
    const parsed: unknown = JSON.parse(decodeURIComponent(cookie.slice(NOTICE_STORAGE_KEY.length + 1)));
    return isValidNoticeAcceptance(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeAcceptance(acceptance: NoticeAcceptance) {
  try {
    localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(acceptance));
  } catch {
    // The first-party cookie remains available when localStorage is blocked.
  }
  try {
    const domain = location.hostname === 'dmiyc.com' || location.hostname === 'www.dmiyc.com' ? '; Domain=.dmiyc.com' : '';
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${NOTICE_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(acceptance))}; Max-Age=31536000; Path=/${domain}; SameSite=Lax${secure}`;
  } catch {
    // Continue; the server cookie request below is an additional persistence path.
  }
  void fetch('/api/privacy-notice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(acceptance),
    keepalive: true,
  }).catch(() => {
    // The localStorage acceptance still persists if the cookie endpoint is unavailable.
  });
}

export default function PrivacyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTICE_STORAGE_KEY);
      if (stored && isValidNoticeAcceptance(JSON.parse(stored))) {
        setVisible(false);
        return;
      }
    } catch {
      // Cookie fallback below also covers browsers where localStorage is unavailable.
    }

    // Carry forward an acceptance from the previous, tab-scoped implementation.
    try {
      if (sessionStorage.getItem(LEGACY_DISMISSAL_KEY) === '1') {
        sessionStorage.removeItem(LEGACY_DISMISSAL_KEY);
        const migrated: NoticeAcceptance = { accepted: true, at: new Date().toISOString(), policyVersion: POLICY_VERSION };
        writeAcceptance(migrated);
        setVisible(false);
        return;
      }
    } catch {
      // Continue with the durable cookie fallback.
    }

    setVisible(readCookieAcceptance() === null);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    const acceptance: NoticeAcceptance = {
      accepted: true,
      at: new Date().toISOString(),
      policyVersion: POLICY_VERSION,
    };

    writeAcceptance(acceptance);
    setVisible(false);
  };

  return (
    <aside className="privacy-notice" aria-label="Aviso de privacidad y cookies">
      <div className="privacy-notice__copy">
        <strong>Privacidad y tecnologías necesarias</strong>
        <p>
          DMIYC no instala cookies de analítica, publicidad ni seguimiento. Usa recursos técnicos para mostrar la web y consultar la API.{' '}
          <Link href="/cookies">Ver política de cookies</Link> · <Link href="/privacidad">Privacidad</Link>
        </p>
      </div>
      <button type="button" className="privacy-notice__button" onClick={dismiss}>
        Entendido
      </button>
    </aside>
  );
}
