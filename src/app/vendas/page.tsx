'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Table, { Tr, Td } from '@/components/ui/Table'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { money, date, saleStatus } from '@/lib/formatters'

export default function VendasPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ origin: 'direct', taxRate: 10, saleDate: new Date().toISOString().slice(0,10), items: [] })

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/sales'),
      api.get('/products'),
      api.get('/people/sellers'),
      api.get('/customers'),
    ]).then(([s, p, sel, c]) => {
      setSales(s.data)
      setProducts(p.data)
      setSellers(sel.data)
      setCustomers(c.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const addItem = () => setForm((f: any) => ({ ...f, items: [...f.items, { productId: '', type: 'MONTHLY', grossValue: 0 }] }))
  const removeItem = (i: number) => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, idx: number) => idx !== i) }))
  const updateItem = (i: number, field: string, val: any) => setForm((f: any) => ({
    ...f, items: f.items.map((item: any, idx: number) => idx === i ? { ...item, [field]: val } : item)
  }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/sales', form)
      setShowModal(false)
      setForm({ origin: 'direct', taxRate: 10, saleDate: new Date().toISOString().slice(0,10), items: [] })
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const origins = [
    { value: 'direct', label: 'Venda Direta' },
    { value: 'partner', label: 'Indicação de Parceiro' },
    { value: 'employee', label: 'Indicação de Colaborador' },
    { value: 'upsell', label: 'Upsell' },
    { value: 'crosssell', label: 'Cross-sell' },
    { value: 'inbound', label: 'Lead Inbound' },
    { value: 'outbound', label: 'Lead Outbound' },
    { value: 'campaign', label: 'Campanha' },
    { value: 'referral', label: 'Indicação de Cliente' },
    { value: 'event', label: 'Evento' },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Lançamento e controle de vendas realizadas"
        action={<button onClick={() => setShowModal(true)} className="btn-primary">+ Nova Venda</button>}
      />

      <div className="card overflow-hidden">
        {sales.length === 0 ? (
          <EmptyState icon="🛒" title="Nenhuma venda cadastrada" description="Clique em Nova Venda para lançar a primeira venda." action={<button onClick={() => setShowModal(true)} className="btn-primary">Nova Venda</button>} />
        ) : (
          <Table headers={['Cliente', 'Vendedor', 'Origem', 'Data', 'Status', 'Itens']}>
            {sales.map(s => {
              const st = saleStatus[s.status] || { label: s.status, color: 'gray' }
              return (
                <Tr key={s.id}>
                  <Td><div className="font-medium">{s.customer?.companyName || '—'}</div></Td>
                  <Td><div className="text-gray-600">{s.seller?.name || '—'}</div></Td>
                  <Td><div className="text-xs text-gray-500">{origins.find(o => o.value === s.origin)?.label || s.origin}</div></Td>
                  <Td>{date(s.saleDate)}</Td>
                  <Td><Badge color={st.color as any}>{st.label}</Badge></Td>
                  <Td><span className="text-xs text-gray-400">{s.items?.length || 0} item(s)</span></Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Venda" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={form.customerId || ''} onChange={e => setForm((f: any) => ({...f, customerId: e.target.value}))} required>
                <option value="">Selecione...</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vendedor *</label>
              <select className="input" value={form.sellerId || ''} onChange={e => setForm((f: any) => ({...f, sellerId: e.target.value}))} required>
                <option value="">Selecione...</option>
                {sellers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Origem *</label>
              <select className="input" value={form.origin} onChange={e => setForm((f: any) => ({...f, origin: e.target.value}))}>
                {origins.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data da Venda *</label>
              <input type="date" className="input" value={form.saleDate} onChange={e => setForm((f: any) => ({...f, saleDate: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Data Contrato</label>
              <input type="date" className="input" value={form.contractDate || ''} onChange={e => setForm((f: any) => ({...f, contractDate: e.target.value}))} />
            </div>
            <div>
              <label className="label">Impostos (%)</label>
              <input type="number" className="input" value={form.taxRate} min={0} max={100} step={0.01} onChange={e => setForm((f: any) => ({...f, taxRate: parseFloat(e.target.value)}))} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Itens da Venda</label>
              <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Adicionar item</button>
            </div>
            {form.items.length === 0 && <p className="text-sm text-gray-400 py-2">Nenhum item adicionado</p>}
            {form.items.map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                <select className="input" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)} required>
                  <option value="">Produto...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {products.flatMap((p: any) => p.modules || []).map((m: any) => <option key={m.id} value={m.id}>↳ {m.name}</option>)}
                </select>
                <select className="input" value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}>
                  <option value="MONTHLY">Mensalidade</option>
                  <option value="IMPLANTATION">Implantação</option>
                  <option value="ONE_TIME">Avulso</option>
                  <option value="ANNUAL">Anual</option>
                </select>
                <div className="flex gap-1">
                  <input type="number" className="input" placeholder="Valor bruto" value={item.grossValue || ''} min={0} step={0.01} onChange={e => updateItem(i, 'grossValue', parseFloat(e.target.value))} required />
                  <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-2">×</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Criar Venda'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
