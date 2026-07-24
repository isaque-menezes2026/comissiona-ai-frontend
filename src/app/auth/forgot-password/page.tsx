'use client'
import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao solicitar redefinição de senha')
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Esqueci minha senha</h2>
          {sent ? (
            <div className="text-sm text-gray-600 space-y-4">
              <p>Se o e-mail informado estiver cadastrado, você vai receber um link para criar uma nova senha em instantes. Confira também a caixa de spam.</p>
              <Link href="/auth/login" className="text-blue-600 hover:underline">Voltar para o login</Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">Informe seu e-mail de acesso. Vamos enviar um link para você criar uma nova senha.</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="seu@email.com" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-2.5">
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
              <Link href="/auth/login" className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-5">Voltar para o login</Link>
            </>
          )}
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">2026 Support Solutions</p>
      </div>
    </div>
  )
}
