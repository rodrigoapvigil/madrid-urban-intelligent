import Link from 'next/link';
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
        <Link href="/" className="site-brand">Madrid Urban Intelligence</Link>
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
        <strong>Madrid Urban Intelligence</strong>
        <span>Inteligencia del mercado residencial de Madrid.</span>
        <small>Las estimaciones son estadísticas y no sustituyen una tasación pericial oficial.</small>
      </div>
    </footer>
  );
}
