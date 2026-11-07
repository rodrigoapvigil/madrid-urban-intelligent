import React from 'react'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import '../components/SiteChrome.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://dmiyc.com'),
  title: {
    default: 'Decide Madrid: Invierte y Compra | Precios por barrio',
    template: '%s | Decide Madrid: Invierte Y Compra',
  },
  description: 'Precios de cierre oficial de alquiler, compra e inversión en los 131 barrios de Madrid. Compara distritos, analiza tendencias reales y negocia con datos sin sobreprecios.',
  applicationName: 'Decide Madrid: Invierte Y Compra',
  icons: { icon: '/icon.png', shortcut: '/icon.png', apple: '/icon.png' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website', locale: 'es_ES', url: 'https://dmiyc.com/', siteName: 'Decide Madrid: Invierte Y Compra',
    title: 'Decide Madrid: Invierte y Compra | Precios por barrio',
    description: 'Precios de cierre oficial y rentabilidad en los 131 barrios de Madrid. Negocia con datos reales, no ofertas infladas.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Decide Madrid: Invierte Y Compra, precios de vivienda por barrio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Decide Madrid: Invierte y Compra | Precios por barrio',
    description: 'Precios de cierre oficial y rentabilidad en 131 barrios de Madrid. Negocia con datos reales.',
    images: ['/opengraph-image'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0E2238',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'WebSite', name: 'Decide Madrid: Invierte Y Compra',
          url: 'https://dmiyc.com/', inLanguage: 'es',
          description: 'Plataforma de consulta y comparación de precios de alquiler, compra y venta de vivienda por zonas de Madrid.',
        }).replace(/</g, '\\u003c') }} />
      </body>
    </html>
  )
}
