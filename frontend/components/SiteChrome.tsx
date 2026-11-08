import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ArrowUpRight, Linkedin, Github } from 'lucide-react';

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
        <Link href="/" className="site-brand">
          <Image src="/decide-madrid-mark.webp" alt="Decide Madrid" width={34} height={34} />
          <span>Decide Madrid: Invierte Y Compra</span>
        </Link>
        {children && <div className="site-header-context">{children}</div>}
        <nav className="site-navigation" aria-label="Navegación principal">
          {links.map((link) => (
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
              Contactar <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Fila central: Enlaces horizontales + Redes sociales */}
        <div className="auros-footer__mid">
          <nav className="auros-footer__nav" aria-label="Enlaces institucionales y legales">
            <Link href="/madrid">Cuadro de mando</Link>
            <Link href="/madrid/chat">AMBI</Link>
            <Link href="/madrid/veredicto">El Veredicto</Link>
            <Link href="/metodologia">Metodología</Link>
            <Link href="/sobre-el-proyecto">Sobre el proyecto</Link>
            <Link href="/contacto">Contacto</Link>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/aviso-legal">Aviso legal</Link>
            <Link href="/cookies">Cookies</Link>
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

        {/* Fila inferior: Crédito institucional + Copyright */}
        <div className="auros-footer__bottom">
          <span className="auros-footer__credit">
            PROYECTO ACADÉMICO INDEPENDIENTE · TRABAJO FIN DE MÁSTER (UPM)
          </span>
          <span className="auros-footer__copyright">
            © 2026 DMIYC
          </span>
        </div>
      </div>
    </footer>
  );
}
