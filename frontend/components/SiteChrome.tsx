'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ArrowUpRight, Linkedin, X } from 'lucide-react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isMobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const effectiveCtaHref = ctaHref || (activePath === '/madrid' ? '/madrid/veredicto' : '/contacto');
  const effectiveCtaText = ctaText || (activePath === '/madrid' ? 'Resumen del análisis' : 'Colabora con nosotros');

  return (
    <>
      <header className="mi-header site-header" role="banner">
        {/* Brand: Logo + Title */}
        <Link href="/" className="mi-brand site-brand" aria-label="DMIYC - Decide Madrid: Invierte Y Compra">
          <span className="mi-brand__mark">
            <Image src="/dmiyc-logo-glow-transparent.png" alt="DMIYC" width={40} height={40} priority unoptimized />
          </span>
          <span className="mi-brand__text">
            <strong className="mi-brand__acronym">DMIYC</strong>
            <small className="mi-brand__subtitle">DECIDE MADRID: INVIERTE Y COMPRA</small>
          </span>
        </Link>

        {/* Desktop Navigation (hidden on mobile) */}
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
            <Link href="/madrid">Plataforma</Link>
            <Link href="/#impacto">A quién ayuda</Link>
            <Link href="/madrid/chat" className={activePath === '/madrid/chat' ? 'active' : ''}>AMBI</Link>
            <Link href="/madrid/veredicto" className={activePath === '/madrid/veredicto' ? 'active' : ''}>El Veredicto</Link>
          </nav>
        )}

        {/* Desktop CTA Button (hidden on mobile) */}
        <Link
          href={effectiveCtaHref}
          className={`mi-header__cta${effectiveCtaHref === '/contacto' ? ' mi-header__cta--secondary' : ''}`}
        >
          {effectiveCtaText}{' '}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>

        {/* Mobile Hamburger Button (Auros style: visible only on mobile / small screens) */}
        <button
          type="button"
          className={`mi-header__menu-btn ${isMobileMenuOpen ? 'is-active' : ''}`}
          aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <span className="mi-hamburger" aria-hidden="true">
              <span className="mi-hamburger__line" />
              <span className="mi-hamburger__line" />
              <span className="mi-hamburger__line" />
            </span>
          )}
        </button>
      </header>

      {/* Auros-Style Fullscreen Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="mi-mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal de navegación"
        >
          {/* Drawer Top Bar */}
          <div className="mi-mobile-drawer__header">
            <Link
              href="/"
              className="mi-brand site-brand"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="DMIYC - Inicio"
            >
              <span className="mi-brand__mark">
                <Image src="/dmiyc-logo-glow-transparent.png" alt="DMIYC" width={36} height={36} priority unoptimized />
              </span>
              <span className="mi-brand__text">
                <strong className="mi-brand__acronym">DMIYC</strong>
                <small className="mi-brand__subtitle">DECIDE MADRID: INVIERTE Y COMPRA</small>
              </span>
            </Link>

            <button
              type="button"
              className="mi-header__menu-btn mi-header__menu-btn--close"
              aria-label="Cerrar menú"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="mi-mobile-drawer__body">
            {/* If profile tabs exist (Dashboard mode) */}
            {profileTabs && profileTabs.length > 0 && (
              <div className="mi-mobile-drawer__profiles">
                <span className="mi-mobile-drawer__section-label">PERFIL DE MERCADO</span>
                <div className="mi-mobile-drawer__profile-pills">
                  {profileTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`mi-mobile-drawer__profile-pill ${activeProfileId === tab.id ? 'active' : ''}`}
                      onClick={() => {
                        onSelectProfile?.(tab.id);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vertical Navigation Links - Auros Styled */}
            <nav className="mi-mobile-drawer__nav" aria-label="Enlaces principales">
              <Link
                href="/madrid"
                className="mi-mobile-drawer__link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>PLATAFORMA</span>
                <ArrowUpRight size={18} className="mi-mobile-drawer__link-arrow" aria-hidden="true" />
              </Link>
              <Link
                href="/#impacto"
                className="mi-mobile-drawer__link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>A QUIÉN AYUDA</span>
                <ArrowUpRight size={18} className="mi-mobile-drawer__link-arrow" aria-hidden="true" />
              </Link>
              <Link
                href="/madrid/chat"
                className={`mi-mobile-drawer__link ${activePath === '/madrid/chat' ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>AMBI (AGENTE IA)</span>
                <ArrowUpRight size={18} className="mi-mobile-drawer__link-arrow" aria-hidden="true" />
              </Link>
              <Link
                href="/madrid/veredicto"
                className={`mi-mobile-drawer__link ${activePath === '/madrid/veredicto' ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>EL VEREDICTO</span>
                <ArrowUpRight size={18} className="mi-mobile-drawer__link-arrow" aria-hidden="true" />
              </Link>
              <Link
                href="/madrid"
                className={`mi-mobile-drawer__link ${activePath === '/madrid' ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>CUADRO DE MANDO</span>
                <ArrowUpRight size={18} className="mi-mobile-drawer__link-arrow" aria-hidden="true" />
              </Link>
            </nav>

            {/* Prominent CTA Button in Drawer */}
            <div className="mi-mobile-drawer__cta-wrap">
              <Link
                href={effectiveCtaHref}
                className="mi-mobile-drawer__cta"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {effectiveCtaText}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>

            {/* Drawer Footer with secondary links & socials */}
            <div className="mi-mobile-drawer__footer">
              <div className="mi-mobile-drawer__secondary-links">
                <Link href="/metodologia" onClick={() => setIsMobileMenuOpen(false)}>Metodología</Link>
                <Link href="/sobre-el-proyecto" onClick={() => setIsMobileMenuOpen(false)}>Sobre el proyecto</Link>
                <Link href="/contacto" onClick={() => setIsMobileMenuOpen(false)}>Contacto</Link>
                <Link href="/privacidad" onClick={() => setIsMobileMenuOpen(false)}>Privacidad</Link>
                <Link href="/aviso-legal" onClick={() => setIsMobileMenuOpen(false)}>Aviso legal</Link>
                <Link href="/cookies" onClick={() => setIsMobileMenuOpen(false)}>Cookies</Link>
              </div>

              <div className="mi-mobile-drawer__socials">
                <a
                  href="https://www.linkedin.com/in/rodrigoalonzopenavigil"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Perfil de LinkedIn de Rodrigo Alonso Peña Vigil"
                  className="mi-mobile-drawer__social-btn"
                >
                  <Linkedin size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
            <Link href="/madrid/chat">ASISTENTE AMBI</Link>
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
              href="https://www.linkedin.com/in/rodrigoalonzopenavigil"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Perfil de LinkedIn de Rodrigo Alonso Peña Vigil"
              className="auros-footer__social-btn"
            >
              <Linkedin size={18} />
            </a>
          </div>
        </div>

        {/* Fila inferior: Copyright */}
        <div className="auros-footer__bottom">
          <span className="auros-footer__disclaimer">
            PROYECTO PERSONAL E INDEPENDIENTE.<br />NO ES UNA PLATAFORMA DEL AYUNTAMIENTO DE MADRID NI CUENTA CON SU AVAL.<br />NO CONSTITUYE ASESORAMIENTO FINANCIERO, DE INVERSIÓN NI INMOBILIARIO.
          </span>
          <span className="auros-footer__copyright">
            © 2026 DMIYC
          </span>
        </div>
      </div>
    </footer>
  );
}
