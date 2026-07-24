'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import PasswordInput from '@/components/ui/PasswordInput'

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!token) { setError('Link inválido. Solicite a redefinição novamente.'); return }
    if (password !== confirmPassword) { setError('A confirmação não confere com a nova senha.'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Link inválido ou expirado. Solicite a redefinição novamente.')
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-2xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Criar nova senha</h2>
      {done ? (
        <p className="text-sm text-gray-600">Senha redefinida com sucesso. Redirecionando para o login...</p>
      ) : (
        <>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nova senha</label>
              <PasswordInput minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <PasswordInput minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-2.5">
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
          <Link href="/auth/login" className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-5">Voltar para o login</Link>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-blue-500 rounded-2xl items-center justify-center text-white text-2xl font-bold mb-4">C</div>
          <h1 className="text-2xl font-bold text-white">Comissiona AI</h1>
          <p className="text-gray-400 text-sm mt-1">Gestao de comissoes comerciais</p>
        </div>
        <Suspense fallback={<div className="text-white text-center">Carregando...</div>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-xs text-gray-500 mt-6">2026 Support Solutions</p>
      </div>
    </div>
  )
}
