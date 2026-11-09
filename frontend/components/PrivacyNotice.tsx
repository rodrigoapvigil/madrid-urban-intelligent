'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const DISMISSAL_KEY = 'dmiyc-privacy-notice-seen-v1';

export default function PrivacyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(sessionStorage.getItem(DISMISSAL_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSAL_KEY, '1');
    } catch {
      // If storage is blocked, the notice remains dismissible for this render.
    }
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
