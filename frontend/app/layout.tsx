import React from 'react'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import '../components/SiteChrome.css'

export const metadata: Metadata = {
  title: 'Madrid Urban Intelligence',
  description: 'Sistema de inteligencia urbana para la ciudad de Madrid',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
