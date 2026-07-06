'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import Sidebar from './Sidebar'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  // O estado de autenticação vem de um store Zustand com persistência em
  // localStorage. Essa reidratação acontece de forma ASSÍNCRONA depois que o
  // JS carrega — então, em qualquer navegação com reload completo da página
  // (F5, digitar a URL direto, ou um <a href> comum em vez de <Link>), o
  // primeiro render acontece com isAuthenticated ainda no valor inicial
  // (false), antes do token salvo ser lido do localStorage. Sem esperar essa
  // reidratação, o usuário era redirecionado pro login à toa, mesmo já
  // estando logado e com o token válido salvo.
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true)
      return
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHasHydrated(true))
    return unsub
  }, [])

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push('/auth/login')
  }, [hasHydrated, isAuthenticated, router])

  if (!hasHydrated) return <LoadingSpinner />
  if (!isAuthenticated) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
