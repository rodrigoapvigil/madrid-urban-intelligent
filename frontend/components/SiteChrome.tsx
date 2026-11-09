import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ArrowUpRight, Linkedin, Github } from 'lucide-react';

type SiteHeaderProps = {
  activePath?: string;
  children?: ReactNode;
  profileTabs?: { id: string; label: string }[];
  activeProfileId?: string;
  onSelectProfile?: (id: string) => void;
  ctaText?: string;
  ctaHref?: string;
};

export function SiteHeader({
  activePath,
  children,
  profileTabs,
  activeProfileId,
  onSelectProfile,
  ctaText,
  ctaHref,
}: SiteHeaderProps) {
  return (
    <header className="mi-header site-header" role="banner">
      <Link href="/" className="mi-brand site-brand" aria-label="DMIYC - Decide Madrid: Invierte Y Compra">
        <span className="mi-brand__mark">
          <Image src="/dmiyc-logo-glow-transparent.png" alt="DMIYC" width={40} height={40} priority unoptimized />
        </span>
        <span className="mi-brand__text">
          <strong className="mi-brand__acronym">DMIYC</strong>
          <small className="mi-brand__subtitle">DECIDE MADRID: INVIERTE Y COMPRA</small>
        </span>
      </Link>

      {profileTabs && profileTabs.length > 0 ? (
        <nav className="mi-nav site-navigation mi-nav--profiles" aria-label="Perfiles de mercado">
          <div className="mi-nav__profile-pill-group">
            {profileTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`mi-nav__profile-pill ${activeProfileId === tab.id ? 'active' : ''}`}
                onClick={() => onSelectProfile?.(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      ) : children ? (
        <nav className="mi-nav site-navigation" aria-label="Navegación">{children}</nav>
      ) : (
        <nav className="mi-nav site-navigation" aria-label="Navegación principal">
          <Link href="/#plataforma">Plataforma</Link>
          <Link href="/#impacto">A quién ayuda</Link>
          <Link href="/madrid/chat" className={activePath === '/madrid/chat' ? 'active' : ''}>AMBI</Link>
          <Link href="/madrid/veredicto" className={activePath === '/madrid/veredicto' ? 'active' : ''}>El Veredicto</Link>
        </nav>
      )}

      <Link
        href={ctaHref || (activePath === '/madrid' ? '/madrid/veredicto' : '/madrid')}
        className="mi-header__cta"
      >
        {ctaText || (activePath === '/madrid' ? 'El Veredicto' : 'Ver precios')}{' '}
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="auros-footer" aria-label="Pie de página">
      <div className="auros-footer__inner">
        {/* Fila superior: Declaración + CTA */}
        <div className="auros-footer__top">
          <div className="auros-footer__statement-wrap">
            <h2 className="auros-footer__statement">
              Haciendo transparente<br />el mercado de Madrid
            </h2>
          </div>
          <div className="auros-footer__cta-wrap">
            <span className="auros-footer__cta-label">Conecta con el proyecto</span>
            <Link href="/contacto" className="auros-footer__cta-button">
              CONTACTAR <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Fila central: Enlaces horizontales + Redes sociales */}
        <div className="auros-footer__mid">
          <nav className="auros-footer__nav" aria-label="Enlaces institucionales y legales">
            <Link href="/madrid">CUADRO DE MANDO</Link>
            <Link href="/madrid/chat">AMBI</Link>
            <Link href="/madrid/veredicto">EL VEREDICTO</Link>
            <Link href="/metodologia">METODOLOGÍA</Link>
            <Link href="/sobre-el-proyecto">SOBRE EL PROYECTO</Link>
            <Link href="/contacto">CONTACTO</Link>
            <Link href="/privacidad">PRIVACIDAD</Link>
            <Link href="/aviso-legal">AVISO LEGAL</Link>
            <Link href="/cookies">COOKIES</Link>
          </nav>

          <div className="auros-footer__socials">
            <a
              href="https://www.linkedin.com/in/rodrigo-vigil/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Perfil de LinkedIn de Rodrigo Vigil"
              className="auros-footer__social-btn"
            >
              <Linkedin size={18} />
            </a>
            <a
              href="https://github.com/rodrigoapvigil/madrid-urban-intelligent"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Repositorio del proyecto en GitHub"
              className="auros-footer__social-btn"
            >
              <Github size={18} />
            </a>
          </div>
        </div>

        {/* Fila inferior: Copyright */}
        <div className="auros-footer__bottom">
          <span className="auros-footer__copyright">
            © 2026 DMIYC
          </span>
        </div>
      </div>
    </footer>
  );
}
