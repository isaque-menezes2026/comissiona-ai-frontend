'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'

const emptyForm = () => ({ type: 'MAIN', hasMonthly: true, generatesCommission: true, active: true })

export default function ProdutosPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(emptyForm())

  const load = () => {
    setLoading(true)
    api.get('/products?includeInactive=true').then(r => setProducts(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  // Abre o modal já preenchido para editar um produto ou módulo existente.
  // Só carrega os campos editáveis (não manda id/tenantId/modules/datas de volta).
  const openEdit = (p: any) => {
    setEditingId(p.id)
    setForm({
      name: p.name || '',
      description: p.description || '',
      type: p.type || 'MAIN',
      parentId: p.parentId || '',
      color: p.color || '',
      hasMonthly: !!p.hasMonthly,
      hasImplantation: !!p.hasImplantation,
      generatesCommission: !!p.generatesCommission,
      allowsUpsell: !!p.allowsUpsell,
      allowsCrossSell: !!p.allowsCrossSell,
      active: p.active !== false,
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, parentId: form.parentId || null }
      if (editingId) {
        await api.patch(`/products/${editingId}`, payload)
      } else {
        await api.post('/products', payload)
      }
      setShowModal(false)
      setEditingId(null)
      setForm(emptyForm())
      load()
    }
    catch (err: any) { alert(err.response?.data?.message || 'Erro ao salvar produto') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Produtos" description="Catalogo de produtos e modulos" action={<button onClick={openNew} className="btn-primary">+ Novo Produto</button>} />

      {products.length === 0 ? (
        <div className="card"><EmptyState icon="📦" title="Nenhum produto cadastrado" action={<button onClick={openNew} className="btn-primary">Novo Produto</button>} /></div>
      ) : (
        <div className="space-y-4">
          {products.map(p => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#3b6cf7' }} />
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <Badge color="blue">{p.type}</Badge>
                    {!p.active && <Badge color="gray">Inativo</Badge>}
                  </div>
                  {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                  <div className="flex gap-2 mt-2">
                    {p.hasMonthly && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Mensalidade</span>}
                    {p.hasImplantation && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">Implantacao</span>}
                    {p.generatesCommission && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">Gera Comissao</span>}
                  </div>
                </div>
                <button onClick={() => openEdit(p)} className="text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg px-2.5 py-1 shrink-0" title="Editar produto">✎ Editar</button>
              </div>
              {p.modules?.length > 0 && (
                <div className="mt-4 border-t border-gray-50 pt-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Modulos ({p.modules.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {p.modules.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="text-sm text-gray-700">{m.name}</span>
                        {!m.active && <span className="text-xs text-gray-400">(inativo)</span>}
                        <button onClick={() => openEdit(m)} className="text-blue-500 hover:text-blue-700 text-xs ml-1" title="Editar modulo">✎</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }} title={editingId ? 'Editar Produto' : 'Novo Produto'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.name || ''} onChange={e => setForm((f: any) => ({...f, name: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Descricao</label>
            <textarea className="input" rows={2} value={form.description || ''} onChange={e => setForm((f: any) => ({...f, description: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={e => setForm((f: any) => ({...f, type: e.target.value}))}>
                <option value="MAIN">Principal</option>
                <option value="MODULE">Modulo</option>
                <option value="ADDON">Add-on</option>
                <option value="SERVICE">Servico</option>
              </select>
            </div>
            <div>
              <label className="label">Produto Pai (se modulo)</label>
              <select className="input" value={form.parentId || ''} onChange={e => setForm((f: any) => ({...f, parentId: e.target.value || null}))}>
                <option value="">Nenhum</option>
                {products.filter(p => p.type === 'MAIN' && p.id !== editingId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {[['hasMonthly','Tem Mensalidade'],['hasImplantation','Tem Implantacao'],['generatesCommission','Gera Comissao'],['allowsUpsell','Permite Upsell'],['active','Ativo']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form[key] || false} onChange={e => setForm((f: any) => ({...f, [key]: e.target.checked}))} />
                {label}
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditingId(null) }} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Criar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
