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
    default: 'DMIYC · Datos de Mercado Inmobiliario y Cierres | Precios por barrio',
    template: '%s | DMIYC · Datos de Mercado Inmobiliario y Cierres',
  },
  description: 'Consulta precios de cierre de alquiler, compra e inversión en los 131 barrios de Madrid y compara zonas con referencias estadísticas informativas.',
  applicationName: 'Datos de Mercado Inmobiliario y Cierres (DMIYC)',
  icons: { icon: '/icon.png', shortcut: '/icon.png', apple: '/icon.png' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website', locale: 'es_ES', url: 'https://dmiyc.com/', siteName: 'Datos de Mercado Inmobiliario y Cierres (DMIYC)',
    title: 'DMIYC · Datos de Mercado Inmobiliario y Cierres | Precios por barrio',
    description: 'Precios de cierre oficial y rentabilidad en los 131 barrios de Madrid. Negocia con datos reales, no ofertas infladas.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Datos de Mercado Inmobiliario y Cierres (DMIYC), precios de vivienda por barrio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DMIYC · Datos de Mercado Inmobiliario y Cierres | Precios por barrio',
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
          '@context': 'https://schema.org', '@type': 'WebSite', name: 'Datos de Mercado Inmobiliario y Cierres (DMIYC)',
          url: 'https://dmiyc.com/', inLanguage: 'es',
          description: 'Plataforma de consulta y comparación de precios de alquiler, compra y venta de vivienda por zonas de Madrid.',
        }).replace(/</g, '\\u003c') }} />
      </body>
    </html>
  )
}
