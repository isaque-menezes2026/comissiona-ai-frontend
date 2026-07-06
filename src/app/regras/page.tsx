'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import { commissionType } from '@/lib/formatters'

const triggerLabels: Record<string, string> = {
  CONTRACT_SIGNED: 'Contrato assinado',
  INVOICE_ISSUED: 'Fatura emitida',
  INVOICE_PAID: 'Fatura paga',
  FIRST_INVOICE_PAID: '1a fatura paga',
  THIRD_INVOICE_PAID: '3a fatura paga',
  MANUAL_APPROVAL: 'Aprovacao manual',
}

const beneficiaryGroups: { key: string; label: string; icon: string }[] = [
  { key: 'PARTNER', label: 'Parceiros', icon: '🤝' },
  { key: 'SELLER', label: 'Vendedores', icon: '👤' },
  { key: 'EMPLOYEE', label: 'Colaboradores', icon: '🏢' },
]

function ruleValue(r: any) {
  if (r.fixedAmount) return `R$ ${Number(r.fixedAmount).toFixed(2)}`
  if (r.percentage) return `${Number(r.percentage).toFixed(1)}%`
  return '—'
}

// Agrupa uma lista de regras por produto (ou "Todos os produtos" quando productId é nulo)
function groupByProduct(rules: any[]) {
  const map = new Map<string, { productName: string; rules: any[] }>()
  for (const r of rules) {
    const key = r.product?.id || r.productId || 'ALL'
    const productName = r.product?.name || 'Todos os produtos'
    if (!map.has(key)) map.set(key, { productName, rules: [] })
    map.get(key)!.rules.push(r)
  }
  return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName))
}

export default function RegrasPage() {
  const [rules, setRules] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', triggerEvent: 'THIRD_INVOICE_PAID', appliesOnNetAmount: true, active: true })

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/commission-rules'), api.get('/products')])
      .then(([r, p]) => { setRules(r.data); setProducts(p.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/commission-rules', form); setShowModal(false); load() }
    catch (err: any) { alert(err.response?.data?.message || 'Erro') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Regras de Comissao" description="Configure as regras de calculo para cada produto e canal" action={<button onClick={() => setShowModal(true)} className="btn-primary">+ Nova Regra</button>} />

      {rules.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <p className="text-lg">Nenhuma regra cadastrada ainda</p>
          <p className="text-sm mt-2">Clique em &ldquo;+ Nova Regra&rdquo; para criar a primeira.</p>
        </div>
      ) : (
        beneficiaryGroups.map(group => {
          const groupRules = rules.filter(r => r.beneficiaryType === group.key)
          if (groupRules.length === 0) return null
          const byProduct = groupByProduct(groupRules)

          return (
            <div key={group.key} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{group.icon}</span>
                <h2 className="text-base font-semibold text-gray-900">{group.label}</h2>
                <span className="text-xs text-gray-400">({groupRules.length} regra{groupRules.length !== 1 ? 's' : ''})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {byProduct.map(({ productName, rules: productRules }) => (
                  <div key={productName} className="card p-5">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
                      <h3 className="font-semibold text-gray-800 text-sm">📦 {productName}</h3>
                      <Badge color="blue">{productRules.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {productRules.map((r, i) => (
                        <div key={r.id} className={i > 0 ? 'pt-3 border-t border-gray-50' : ''}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{r.name}</span>
                            <span className="text-sm font-semibold text-indigo-600">{ruleValue(r)}</span>
                          </div>
                          {r.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-gray-400">{commissionType[r.commissionType] || r.commissionType} · {triggerLabels[r.triggerEvent] || r.triggerEvent}</span>
                            <Badge color={r.active ? 'green' : 'gray'}>{r.active ? 'Ativa' : 'Inativa'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Regra de Comissao" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nome da Regra *</label>
            <input className="input" value={form.name || ''} onChange={e => setForm((f: any) => ({...f, name: e.target.value}))} placeholder="Ex: Kualiz - 3a Mensalidade" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Produto (opcional)</label>
              <select className="input" value={form.productId || ''} onChange={e => setForm((f: any) => ({...f, productId: e.target.value || null}))}>
                <option value="">Todos os produtos</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                {products.flatMap((p: any) => p.modules || []).map((m: any) => <option key={m.id} value={m.id}>  {m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Beneficiario *</label>
              <select className="input" value={form.beneficiaryType} onChange={e => setForm((f: any) => ({...f, beneficiaryType: e.target.value}))}>
                <option value="SELLER">Vendedor</option>
                <option value="PARTNER">Parceiro</option>
                <option value="EMPLOYEE">Colaborador</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de Comissao *</label>
              <select className="input" value={form.commissionType} onChange={e => setForm((f: any) => ({...f, commissionType: e.target.value}))}>
                {Object.entries(commissionType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Gatilho *</label>
              <select className="input" value={form.triggerEvent} onChange={e => setForm((f: any) => ({...f, triggerEvent: e.target.value}))}>
                {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.commissionType !== 'FIXED_AMOUNT' && (
              <div>
                <label className="label">Percentual (%)</label>
                <input type="number" className="input" min={0} max={100} step={0.01} value={form.percentage || ''} onChange={e => setForm((f: any) => ({...f, percentage: e.target.value}))} />
              </div>
            )}
            {form.commissionType === 'FIXED_AMOUNT' && (
              <div>
                <label className="label">Valor Fixo (R$)</label>
                <input type="number" className="input" min={0} step={0.01} value={form.fixedAmount || ''} onChange={e => setForm((f: any) => ({...f, fixedAmount: e.target.value}))} />
              </div>
            )}
            <div>
              <label className="label">Prazo previsto (dias)</label>
              <input type="number" className="input" min={0} value={form.appliesAfterDays || ''} onChange={e => setForm((f: any) => ({...f, appliesAfterDays: parseInt(e.target.value)}))} placeholder="Ex: 90" />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.appliesOnNetAmount} onChange={e => setForm((f: any) => ({...f, appliesOnNetAmount: e.target.checked}))} />Calcular sobre valor liquido</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresCustomerActive} onChange={e => setForm((f: any) => ({...f, requiresCustomerActive: e.target.checked}))} />Requer cliente ativo</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({...f, active: e.target.checked}))} />Ativa</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Criar Regra'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
