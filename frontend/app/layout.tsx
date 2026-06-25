import React from 'react'
import './globals.css'

export const metadata = {
  title: 'Madrid Urban Intelligence',
  description: 'Sistema de inteligencia urbana para la ciudad de Madrid',
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
