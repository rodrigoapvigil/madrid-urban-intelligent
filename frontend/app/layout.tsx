import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Anton } from 'next/font/google'
import SmoothScroll from '../components/SmoothScroll'
import PrivacyNotice from '../components/PrivacyNotice'
import './globals.css'
import '../components/SiteChrome.css'

const display = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-ls-display',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://dmiyc.com'),
  title: {
    default: 'DMIYC · Precios Reales de Vivienda en Madrid por Barrio',
    template: '%s | DMIYC · Precios Madrid',
  },
  description: 'Consulta precios de cierre de alquiler, compra, venta y rentabilidad en los 131 barrios y 21 distritos de Madrid con datos reales y series oficiales.',
  keywords: [
    'precio vivienda Madrid por barrio',
    'precio real alquiler Madrid',
    'precio metro cuadrado Madrid barrios',
    'rentabilidad alquiler Madrid',
    'datos mercado inmobiliario Madrid',
    'precios de cierre inmobiliario Madrid',
    'DMIYC',
  ],
  applicationName: 'Datos de Mercado Inmobiliario y Cierres (DMIYC)',
  icons: { icon: '/icon.png', shortcut: '/icon.png', apple: '/icon.png' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' } },
  openGraph: {
    type: 'website', locale: 'es_ES', url: 'https://dmiyc.com/', siteName: 'Datos de Mercado Inmobiliario y Cierres (DMIYC)',
    title: 'DMIYC · Precios Reales de Vivienda en Madrid por Barrio',
    description: 'Precios de cierre oficial y rentabilidad en los 131 barrios de Madrid. Negocia con datos reales, no ofertas infladas.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Datos de Mercado Inmobiliario y Cierres (DMIYC), precios de vivienda por barrio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DMIYC · Precios Reales de Vivienda en Madrid por Barrio',
    description: 'Precios de cierre oficial y rentabilidad en 131 barrios de Madrid. Negocia con datos reales.',
    images: ['/opengraph-image'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  viewportFit: 'cover',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#14213D',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={display.variable}>
      <body>
        <SmoothScroll />
        {children}
        <PrivacyNotice />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': 'https://dmiyc.com/#organization',
              name: 'Datos de Mercado Inmobiliario y Cierres (DMIYC)',
              alternateName: 'DMIYC',
              url: 'https://dmiyc.com/',
              logo: 'https://dmiyc.com/icon.png',
              description: 'Plataforma independiente de análisis territorial y precios reales de cierre del mercado residencial en Madrid.',
            },
            {
              '@type': 'WebSite',
              '@id': 'https://dmiyc.com/#website',
              name: 'Datos de Mercado Inmobiliario y Cierres (DMIYC)',
              url: 'https://dmiyc.com/',
              inLanguage: 'es',
              publisher: { '@id': 'https://dmiyc.com/#organization' },
              description: 'Plataforma de consulta y comparación de precios de alquiler, compra, venta y rentabilidad por barrio y distrito en Madrid.',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://dmiyc.com/madrid?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@type': 'Dataset',
              '@id': 'https://dmiyc.com/#dataset',
              name: 'Precios de Cierre, Alquiler y Rentabilidad Residencial en Madrid (131 Barrios y 21 Distritos)',
              description: 'Series estadísticas y referencias por metro cuadrado de alquiler, compraventa y rentabilidad bruta estimada en los 131 barrios y 21 distritos de Madrid.',
              url: 'https://dmiyc.com/madrid',
              inLanguage: 'es',
              creator: { '@id': 'https://dmiyc.com/#organization' },
              spatialCoverage: {
                '@type': 'Place',
                name: 'Madrid, España',
                geo: { '@type': 'GeoCoordinates', latitude: 40.4168, longitude: -3.7038 },
              },
              isAccessibleForFree: true,
              keywords: ['precio vivienda Madrid', 'alquiler Madrid', 'rentabilidad inmobiliaria Madrid', 'barrios de Madrid'],
            },
          ],
        }).replace(/</g, '\\u003c') }} />
      </body>
    </html>
  )
}
