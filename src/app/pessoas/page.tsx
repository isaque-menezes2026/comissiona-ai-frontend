'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Table, { Tr, Td } from '@/components/ui/Table'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'

export default function PessoasPage() {
  const [tab, setTab] = useState<'sellers'|'partners'|'employees'>('sellers')
  const [data, setData] = useState<any>({ sellers: [], partners: [], employees: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/people/sellers'), api.get('/people/partners'), api.get('/people/employees')])
      .then(([s, p, e]) => setData({ sellers: s.data, partners: p.data, employees: e.data }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreateModal = () => {
    setEditingId(null)
    setForm({ active: true })
    setShowModal(true)
  }

  const openEditModal = (item: any) => {
    setEditingId(item.id)
    setForm({ ...item })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editingId) {
        await api.patch(`/people/${tab}/${editingId}`, form)
      } else {
        await api.post(`/people/${tab}`, form)
      }
      setShowModal(false); setForm({}); load()
    } catch (err: any) { alert(err.response?.data?.message || 'Erro') }
    finally { setSaving(false) }
  }

  const toggleActive = async (item: any) => {
    try {
      await api.patch(`/people/${tab}/${item.id}`, { active: !item.active })
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Erro') }
  }

  const tabs = [
    { key: 'sellers', label: 'Vendedores', icon: '👤' },
    { key: 'partners', label: 'Parceiros', icon: '🤝' },
    { key: 'employees', label: 'Colaboradores', icon: '👷' },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Pessoas" description="Vendedores, parceiros e colaboradores indicadores" action={<button onClick={openCreateModal} className="btn-primary">+ Cadastrar</button>} />

      <div className="flex gap-1 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            <span>{t.icon}</span>{t.label} <span className="ml-1 text-xs opacity-70">({(data[t.key] || []).length})</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {tab === 'sellers' && (
          <Table headers={['Nome', 'E-mail', 'Cargo', 'Equipe', 'Status', '']}>
            {data.sellers.map((s: any) => (
              <Tr key={s.id}>
                <Td><div className="font-medium">{s.name}</div></Td>
                <Td><div className="text-sm text-gray-500">{s.email}</div></Td>
                <Td><div className="text-sm text-gray-500">{s.role || '—'}</div></Td>
                <Td><div className="text-sm text-gray-500">{s.team || '—'}</div></Td>
                <Td>
                  <button onClick={() => toggleActive(s)}>
                    <Badge color={s.active ? 'green' : 'gray'}>{s.active ? 'Ativo' : 'Inativo'}</Badge>
                  </button>
                </Td>
                <Td><button onClick={() => openEditModal(s)} className="text-gray-400 hover:text-blue-500 text-sm">Editar</button></Td>
              </Tr>
            ))}
          </Table>
        )}
        {tab === 'partners' && (
          <Table headers={['Nome', 'Tipo', 'E-mail', 'Chave Pix', 'Status', '']}>
            {data.partners.map((p: any) => (
              <Tr key={p.id}>
                <Td><div className="font-medium">{p.name}</div></Td>
                <Td><Badge color="blue">{p.type === 'pj' ? 'PJ' : 'PF'}</Badge></Td>
                <Td><div className="text-sm text-gray-500">{p.email}</div></Td>
                <Td><div className="text-xs font-mono text-gray-400">{p.pixKey || '—'}</div></Td>
                <Td>
                  <button onClick={() => toggleActive(p)}>
                    <Badge color={p.active ? 'green' : 'gray'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
                  </button>
                </Td>
                <Td><button onClick={() => openEditModal(p)} className="text-gray-400 hover:text-blue-500 text-sm">Editar</button></Td>
              </Tr>
            ))}
          </Table>
        )}
        {tab === 'employees' && (
          <Table headers={['Nome', 'E-mail', 'Departamento', 'Status', '']}>
            {data.employees.map((e: any) => (
              <Tr key={e.id}>
                <Td><div className="font-medium">{e.name}</div></Td>
                <Td><div className="text-sm text-gray-500">{e.email}</div></Td>
                <Td><div className="text-sm text-gray-500">{e.department || '—'}</div></Td>
                <Td>
                  <button onClick={() => toggleActive(e)}>
                    <Badge color={e.active ? 'green' : 'gray'}>{e.active ? 'Ativo' : 'Inativo'}</Badge>
                  </button>
                </Td>
                <Td><button onClick={() => openEditModal(e)} className="text-gray-400 hover:text-blue-500 text-sm">Editar</button></Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editingId ? 'Editar' : 'Cadastrar'} ${tabs.find(t => t.key === tab)?.label}`}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.name || ''} onChange={e => setForm((f: any) => ({...f, name: e.target.value}))} required />
          </div>
          <div>
            <label className="label">E-mail *</label>
            <input type="email" className="input" value={form.email || ''} onChange={e => setForm((f: any) => ({...f, email: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={form.phone || ''} onChange={e => setForm((f: any) => ({...f, phone: e.target.value}))} />
          </div>
          {tab === 'sellers' && (
            <>
              <div><label className="label">Cargo</label><input className="input" value={form.role || ''} onChange={e => setForm((f: any) => ({...f, role: e.target.value}))} /></div>
              <div><label className="label">Equipe</label><input className="input" value={form.team || ''} onChange={e => setForm((f: any) => ({...f, team: e.target.value}))} /></div>
            </>
          )}
          {tab === 'partners' && (
            <>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type || 'pf'} onChange={e => setForm((f: any) => ({...f, type: e.target.value}))}>
                  <option value="pf">Pessoa Fisica</option>
                  <option value="pj">Pessoa Juridica</option>
                </select>
              </div>
              <div><label className="label">Chave Pix</label><input className="input" value={form.pixKey || ''} onChange={e => setForm((f: any) => ({...f, pixKey: e.target.value}))} /></div>
            </>
          )}
          {tab === 'employees' && (
            <div><label className="label">Departamento</label><input className="input" value={form.department || ''} onChange={e => setForm((f: any) => ({...f, department: e.target.value}))} /></div>
          )}
          {editingId && (
            <div className="flex items-center gap-2">
              <input id="active-toggle" type="checkbox" checked={!!form.active} onChange={e => setForm((f: any) => ({...f, active: e.target.checked}))} />
              <label htmlFor="active-toggle" className="label mb-0">Ativo</label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
