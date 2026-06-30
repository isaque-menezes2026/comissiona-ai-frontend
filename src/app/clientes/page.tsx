'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Table, { Tr, Td } from '@/components/ui/Table'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { date } from '@/lib/formatters'

const statusOptions = [
  { value: 'active', label: 'Ativo', color: 'green' },
  { value: 'inactive', label: 'Inativo', color: 'gray' },
  { value: 'prospect', label: 'Prospecto', color: 'blue' },
  { value: 'churned', label: 'Cancelado', color: 'red' },
]

export default function ClientesPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<any>({ status: 'active', origin: 'direct' })

  const load = (s = search) => {
    setLoading(true)
    Promise.all([
      api.get('/customers' + (s ? `?search=${s}` : '')),
      api.get('/people/sellers'),
      api.get('/people/partners'),
    ]).then(([c, sel, par]) => { setCustomers(c.data); setSellers(sel.data); setPartners(par.data) })
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/customers', form)
      setShowModal(false); setForm({ status: 'active', origin: 'direct' }); load()
    } catch (err: any) { alert(err.response?.data?.message || 'Erro') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Clientes" description="Cadastro de clientes e empresas" action={<button onClick={() => setShowModal(true)} className="btn-primary">+ Novo Cliente</button>} />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input className="input max-w-xs" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(search)} />
        </div>
        {customers.length === 0 ? (
          <EmptyState icon="🏢" title="Nenhum cliente cadastrado" action={<button onClick={() => setShowModal(true)} className="btn-primary">Novo Cliente</button>} />
        ) : (
          <Table headers={['Empresa', 'Documento', 'Cidade/UF', 'Vendedor', 'Entrada', 'Status']}>
            {customers.map((c: any) => {
              const st = statusOptions.find(s => s.value === c.status) || { label: c.status, color: 'gray' }
              return (
                <Tr key={c.id}>
                  <Td><div className="font-medium">{c.companyName}</div><div className="text-xs text-gray-400">{c.tradeName}</div></Td>
                  <Td><div className="text-sm font-mono text-gray-500">{c.document || '—'}</div></Td>
                  <Td><div className="text-sm text-gray-500">{[c.city, c.state].filter(Boolean).join('/') || '—'}</div></Td>
                  <Td><div className="text-sm text-gray-600">{c.seller?.name || '—'}</div></Td>
                  <Td>{date(c.entryDate || c.createdAt)}</Td>
                  <Td><Badge color={st.color as any}>{st.label}</Badge></Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Cliente" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Razao Social *</label>
              <input className="input" value={form.companyName || ''} onChange={e => setForm((f: any) => ({...f, companyName: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Nome Fantasia</label>
              <input className="input" value={form.tradeName || ''} onChange={e => setForm((f: any) => ({...f, tradeName: e.target.value}))} />
            </div>
            <div>
              <label className="label">CNPJ/CPF</label>
              <input className="input" value={form.document || ''} onChange={e => setForm((f: any) => ({...f, document: e.target.value}))} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" value={form.email || ''} onChange={e => setForm((f: any) => ({...f, email: e.target.value}))} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.phone || ''} onChange={e => setForm((f: any) => ({...f, phone: e.target.value}))} />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input className="input" value={form.city || ''} onChange={e => setForm((f: any) => ({...f, city: e.target.value}))} />
            </div>
            <div>
              <label className="label">Estado</label>
              <input className="input" maxLength={2} placeholder="MG" value={form.state || ''} onChange={e => setForm((f: any) => ({...f, state: e.target.value.toUpperCase()}))} />
            </div>
            <div>
              <label className="label">Vendedor</label>
              <select className="input" value={form.sellerId || ''} onChange={e => setForm((f: any) => ({...f, sellerId: e.target.value}))}>
                <option value="">Selecione...</option>
                {sellers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Parceiro Indicador</label>
              <select className="input" value={form.partnerId || ''} onChange={e => setForm((f: any) => ({...f, partnerId: e.target.value}))}>
                <option value="">Nenhum</option>
                {partners.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Criar Cliente'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
