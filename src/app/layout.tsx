import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Comissiona AI — Gestão de Comissões',
  description: 'Plataforma SaaS de gestão inteligente de comissões comerciais',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  )
}
