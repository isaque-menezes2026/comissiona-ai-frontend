'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciais invalidas')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-blue-500 rounded-2xl items-center justify-center text-white text-2xl font-bold mb-4">C</div>
          <h1 className="text-2xl font-bold text-white">Comissiona AI</h1>
          <p className="text-gray-400 text-sm mt-1">Gestao de comissoes comerciais</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Entrar na plataforma</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="seu@email.com" required />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="..." required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-2.5">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">2026 Support Solutions</p>
      </div>
    </div>
  )
}
