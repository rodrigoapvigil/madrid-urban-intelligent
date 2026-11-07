import React from 'react'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import '../components/SiteChrome.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://dmiyc.com'),
  title: {
    default: 'Precios de vivienda en Madrid: alquiler y compra por barrio',
    template: '%s | Decide Madrid: Invierte Y Compra',
  },
  description: 'Consulta precios de alquiler, compra y venta por barrio en Madrid. Compara distritos, analiza la evolución mensual y distingue datos oficiales de estimaciones.',
  applicationName: 'Decide Madrid: Invierte Y Compra',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website', locale: 'es_ES', url: 'https://dmiyc.com/', siteName: 'Decide Madrid: Invierte Y Compra',
    title: 'Precios de vivienda en Madrid: alquiler y compra por barrio',
    description: 'Consulta precios de alquiler, compra y venta por barrio en Madrid. Compara distritos y sigue la evolución del mercado.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Decide Madrid: Invierte Y Compra, precios de vivienda por barrio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Precios de vivienda en Madrid: alquiler y compra por barrio',
    description: 'Compara precios de alquiler, compra y venta por distrito y barrio en Madrid.',
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
