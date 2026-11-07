import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AMBI, asistente del mercado inmobiliario de Madrid',
  description: 'Consulta indicadores, precios y tendencias del mercado residencial de Madrid con AMBI.',
  alternates: { canonical: '/madrid/chat' },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
