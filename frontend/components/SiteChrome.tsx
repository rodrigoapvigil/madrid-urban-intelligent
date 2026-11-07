import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

type SiteHeaderProps = {
  activePath?: string;
  children?: ReactNode;
};

export function SiteHeader({ activePath, children }: SiteHeaderProps) {
  const links = [
    { href: '/madrid', label: 'Dashboard' },
    { href: '/madrid/chat', label: 'AMBI' },
    { href: '/madrid/veredicto', label: 'El Veredicto' },
  ];

  return (
    <header className="site-header">
      <div className="site-header-main">
        <Link href="/" className="site-brand"><Image src="/decide-madrid-mark.webp" alt="" width={34} height={34} /><span>Decide Madrid: Invierte Y Compra</span></Link>
        {children && <div className="site-header-context">{children}</div>}
        <nav className="site-navigation" aria-label="Navegación principal">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={activePath === link.href ? 'active' : ''}
              aria-current={activePath === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand"><Image src="/decide-madrid-mark.webp" alt="" width={38} height={38} /><div><strong>Decide Madrid: Invierte Y Compra</strong><span>Proyecto académico independiente y sin ánimo de lucro.</span></div></div>
        <nav className="site-footer-links" aria-label="Enlaces del pie">
          <Link href="/sobre-el-proyecto">Sobre el proyecto</Link><Link href="/metodologia">Metodología</Link><Link href="/contacto">Contacto</Link>
        </nav>
        <small>Las estimaciones son estadísticas y no sustituyen una tasación pericial oficial.</small>
      </div>
    </footer>
  );
}
