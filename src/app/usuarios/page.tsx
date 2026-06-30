'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Table, { Tr, Td } from '@/components/ui/Table'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'

export default function UsuariosPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [resetTarget, setResetTarget] = useState<any | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  const [showSelfModal, setShowSelfModal] = useState(false)
  const [selfForm, setSelfForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [selfSaving, setSelfSaving] = useState(false)
  const [selfError, setSelfError] = useState('')

  const load = () => {
    if (!isAdmin) { setLoading(false); return }
    setLoading(true)
    api.get('/people/users').then(r => setUsers(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [isAdmin])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    setResetSaving(true)
    try {
      await api.patch(`/people/users/${resetTarget.id}/reset-password`, { newPassword: resetPassword })
      setResetTarget(null); setResetPassword('')
      alert('Senha redefinida com sucesso.')
    } catch (err: any) { alert(err.response?.data?.message || 'Erro ao redefinir senha') }
    finally { setResetSaving(false) }
  }

  const handleSelfChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSelfError('')
    if (selfForm.newPassword !== selfForm.confirmPassword) {
      setSelfError('A confirmação não confere com a nova senha.')
      return
    }
    setSelfSaving(true)
    try {
      await api.patch('/auth/change-password', { oldPassword: selfForm.oldPassword, newPassword: selfForm.newPassword })
      setShowSelfModal(false)
      setSelfForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      alert('Sua senha foi alterada com sucesso.')
    } catch (err: any) { setSelfError(err.response?.data?.message || 'Erro ao trocar senha') }
    finally { setSelfSaving(false) }
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        description={isAdmin ? 'Gerencie os usuários do sistema e redefina senhas' : 'Sua conta de acesso'}
        action={<button onClick={() => setShowSelfModal(true)} className="btn-secondary">Trocar minha senha</button>}
      />

      {!isAdmin ? (
        <div className="card p-6">
          <div className="font-medium text-gray-900">{user?.name}</div>
          <div className="text-sm text-gray-500">{user?.email}</div>
          <div className="text-sm text-gray-400 mt-1">{user?.role}</div>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-hidden">
          <Table headers={['Nome', 'E-mail', 'Perfil', 'Status', 'Último acesso', '']}>
            {users.map((u: any) => (
              <Tr key={u.id}>
                <Td><div className="font-medium">{u.name}</div></Td>
                <Td><div className="text-sm text-gray-500">{u.email}</div></Td>
                <Td><Badge color="blue">{u.role}</Badge></Td>
                <Td><Badge color={u.active ? 'green' : 'gray'}>{u.active ? 'Ativo' : 'Inativo'}</Badge></Td>
                <Td><div className="text-sm text-gray-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : '—'}</div></Td>
                <Td><button onClick={() => setResetTarget(u)} className="text-gray-400 hover:text-blue-500 text-sm">Redefinir senha</button></Td>
              </Tr>
            ))}
          </Table>
        </div>
      )}

      <Modal open={!!resetTarget} onClose={() => { setResetTarget(null); setResetPassword('') }} title={`Redefinir senha — ${resetTarget?.name || ''}`} size="sm">
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="label">Nova senha *</label>
            <input type="password" className="input" minLength={6} value={resetPassword} onChange={e => setResetPassword(e.target.value)} required />
          </div>
          <p className="text-xs text-gray-400">O usuário poderá trocar a senha depois pelo próprio acesso.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setResetTarget(null); setResetPassword('') }} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={resetSaving} className="btn-primary flex-1">{resetSaving ? 'Salvando...' : 'Redefinir'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={showSelfModal} onClose={() => setShowSelfModal(false)} title="Trocar minha senha" size="sm">
        <form onSubmit={handleSelfChange} className="space-y-4">
          <div>
            <label className="label">Senha atual *</label>
            <input type="password" className="input" value={selfForm.oldPassword} onChange={e => setSelfForm(f => ({...f, oldPassword: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Nova senha *</label>
            <input type="password" className="input" minLength={6} value={selfForm.newPassword} onChange={e => setSelfForm(f => ({...f, newPassword: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Confirmar nova senha *</label>
            <input type="password" className="input" minLength={6} value={selfForm.confirmPassword} onChange={e => setSelfForm(f => ({...f, confirmPassword: e.target.value}))} required />
          </div>
          {selfError && <p className="text-sm text-red-500">{selfError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowSelfModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={selfSaving} className="btn-primary flex-1">{selfSaving ? 'Salvando...' : 'Trocar senha'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
