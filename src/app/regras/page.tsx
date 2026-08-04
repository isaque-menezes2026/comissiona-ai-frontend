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

const originLabels: Record<string, string> = {
  '': 'Todas as origens',
  direct: 'Venda direta',
  partner: 'Parceiro',
  employee: 'Colaborador',
}

const beneficiaryLabels: Record<string, string> = {
  SELLER: 'Vendedor', PARTNER: 'Parceiro', EMPLOYEE: 'Colaborador',
}

const beneficiaryGroups: { key: string; label: string; icon: string }[] = [
  { key: 'PARTNER', label: 'Parceiros', icon: '🤝' },
  { key: 'SELLER', label: 'Vendedores', icon: '👤' },
  { key: 'EMPLOYEE', label: 'Colaboradores', icon: '🏢' },
]

const emptyForm = () => ({ beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', triggerEvent: 'THIRD_INVOICE_PAID', saleOrigin: '', appliesOnNetAmount: true, requiresCustomerActive: true, active: true })

function ruleValue(r: any) {
  if (r.fixedAmount) return `R$ ${Number(r.fixedAmount).toFixed(2)}`
  if (r.percentage) return `${Number(r.percentage).toFixed(1)}%`
  return '—'
}

function fmtDate(v: any) { return v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—' }
function fmtDateTime(v: any) { try { return new Date(v).toLocaleString('pt-BR') } catch { return String(v) } }

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

// Campos mostrados no histórico (rótulo + formatador), para exibir "antes → depois".
const HISTORY_FIELDS: [string, string, (v: any) => string][] = [
  ['name', 'Nome', v => v || '—'],
  ['percentage', 'Percentual', v => (v == null || v === '' ? '—' : `${Number(v)}%`)],
  ['fixedAmount', 'Valor fixo', v => (v == null || v === '' ? '—' : `R$ ${Number(v).toFixed(2)}`)],
  ['commissionType', 'Tipo', v => commissionType[v] || v || '—'],
  ['triggerEvent', 'Gatilho', v => triggerLabels[v] || v || '—'],
  ['saleOrigin', 'Origem', v => originLabels[v || ''] || v || 'Todas as origens'],
  ['beneficiaryType', 'Beneficiário', v => beneficiaryLabels[v] || v || '—'],
  ['appliesAfterDays', 'Prazo (dias)', v => (v == null || v === '' ? '—' : String(v))],
  ['active', 'Ativa', v => (v === false ? 'Não' : 'Sim')],
  ['startDate', 'Vigência a partir de', v => fmtDate(v)],
  ['endDate', 'Vigência até', v => fmtDate(v)],
]

function valuesEqual(a: any, b: any) {
  const an = a === '' || a === undefined ? null : a
  const bn = b === '' || b === undefined ? null : b
  if (an == null && bn == null) return true
  if (!isNaN(Number(an)) && !isNaN(Number(bn)) && an !== null && bn !== null) return Number(an) === Number(bn)
  return String(an).slice(0, 10) === String(bn).slice(0, 10) || String(an) === String(bn)
}

export default function RegrasPage() {
  const [rules, setRules] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(emptyForm())

  const [historyRule, setHistoryRule] = useState<any>(null)
  const [historyEntries, setHistoryEntries] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/commission-rules'), api.get('/products')])
      .then(([r, p]) => { setRules(r.data); setProducts(p.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setShowModal(true) }

  const openEdit = (r: any) => {
    setEditingId(r.id)
    setForm({
      name: r.name || '',
      description: r.description || '',
      productId: r.productId || '',
      saleOrigin: r.saleOrigin || '',
      beneficiaryType: r.beneficiaryType,
      commissionType: r.commissionType,
      triggerEvent: r.triggerEvent,
      percentage: r.percentage != null ? String(r.percentage) : '',
      fixedAmount: r.fixedAmount != null ? String(r.fixedAmount) : '',
      appliesAfterDays: r.appliesAfterDays != null ? String(r.appliesAfterDays) : '',
      appliesOnNetAmount: r.appliesOnNetAmount !== false,
      requiresCustomerActive: r.requiresCustomerActive !== false,
      requiresManagerApproval: !!r.requiresManagerApproval,
      active: r.active !== false,
      startDate: r.startDate ? String(r.startDate).slice(0, 10) : '',
      endDate: r.endDate ? String(r.endDate).slice(0, 10) : '',
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditingId(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const num = (v: any) => (v === '' || v == null ? null : Number(v))
      const payload = {
        ...form,
        productId: form.productId || null,
        saleOrigin: form.saleOrigin || null,
        percentage: num(form.percentage),
        fixedAmount: num(form.fixedAmount),
        appliesAfterDays: num(form.appliesAfterDays),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }
      if (editingId) await api.patch(`/commission-rules/${editingId}`, payload)
      else await api.post('/commission-rules', payload)
      closeModal()
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Erro ao salvar regra') }
    finally { setSaving(false) }
  }

  const openHistory = async (r: any) => {
    setHistoryRule(r); setHistoryEntries([]); setHistoryLoading(true)
    try {
      const { data } = await api.get(`/commission-rules/${r.id}/history`)
      setHistoryEntries(data)
    } catch (err: any) { alert(err.response?.data?.message || 'Erro ao carregar histórico') }
    finally { setHistoryLoading(false) }
  }

  const renderChanges = (entry: any) => {
    const prev = entry.previousData || {}
    const next = entry.newData || {}
    if (entry.action === 'UPDATE') {
      const changed = HISTORY_FIELDS.filter(([key]) => !valuesEqual(prev[key], next[key]))
      if (changed.length === 0) return <div className="text-xs text-gray-400 mt-1">Alteração registrada.</div>
      return (
        <ul className="mt-1.5 space-y-1">
          {changed.map(([key, label, fmt]) => (
            <li key={key} className="text-xs text-gray-600">
              <span className="text-gray-400">{label}:</span>{' '}
              <span className="line-through text-gray-400">{fmt(prev[key])}</span>{' '}
              <span className="text-gray-400">→</span>{' '}
              <span className="font-medium text-gray-800">{fmt(next[key])}</span>
            </li>
          ))}
        </ul>
      )
    }
    // CREATE / DELETE: resumo dos valores principais no momento
    const snap = entry.action === 'DELETE' ? prev : next
    return (
      <div className="text-xs text-gray-500 mt-1">
        {HISTORY_FIELDS.filter(([key]) => ['percentage', 'fixedAmount', 'commissionType', 'triggerEvent', 'saleOrigin', 'startDate'].includes(key) && snap[key] != null && snap[key] !== '')
          .map(([key, label, fmt]) => `${label}: ${fmt(snap[key])}`).join(' · ') || '—'}
      </div>
    )
  }

  if (loading) return <LoadingSpinner />

  const actionLabel: Record<string, string> = { CREATE: 'Regra criada', UPDATE: 'Regra alterada', DELETE: 'Regra desativada' }

  return (
    <div>
      <PageHeader title="Regras de Comissao" description="Configure as regras de calculo para cada produto e canal" action={<button onClick={openNew} className="btn-primary">+ Nova Regra</button>} />

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
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>Origem: {originLabels[r.saleOrigin || ''] || r.saleOrigin}</span>
                            {r.startDate && <span>· Vigente desde {fmtDate(r.startDate)}</span>}
                            {r.endDate && <span>· até {fmtDate(r.endDate)}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <button onClick={() => openEdit(r)} className="text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg px-2.5 py-1" title="Editar regra">✎ Editar</button>
                            <button onClick={() => openHistory(r)} className="text-xs text-gray-500 hover:text-gray-800" title="Ver histórico de alterações">🕑 Histórico</button>
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

      <Modal open={showModal} onClose={closeModal} title={editingId ? 'Editar Regra de Comissao' : 'Nova Regra de Comissao'} size="lg">
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
              <label className="label">Origem da venda</label>
              <select className="input" value={form.saleOrigin || ''} onChange={e => setForm((f: any) => ({...f, saleOrigin: e.target.value}))}>
                <option value="">Todas as origens</option>
                <option value="direct">Venda direta</option>
                <option value="partner">Parceiro</option>
                <option value="employee">Colaborador</option>
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
              <input type="number" className="input" min={0} value={form.appliesAfterDays || ''} onChange={e => setForm((f: any) => ({...f, appliesAfterDays: e.target.value}))} placeholder="Ex: 90" />
            </div>
            <div>
              <label className="label">Vigência a partir de</label>
              <input type="date" className="input" value={form.startDate || ''} onChange={e => setForm((f: any) => ({...f, startDate: e.target.value}))} />
            </div>
            <div>
              <label className="label">Vigência até (opcional)</label>
              <input type="date" className="input" value={form.endDate || ''} onChange={e => setForm((f: any) => ({...f, endDate: e.target.value}))} />
            </div>
          </div>
          <p className="text-xs text-gray-400">A vigência define a partir de quando a regra passa a valer para novas comissões. Comissões já calculadas não mudam — o histórico guarda o que a regra era antes.</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.appliesOnNetAmount} onChange={e => setForm((f: any) => ({...f, appliesOnNetAmount: e.target.checked}))} />Calcular sobre valor liquido</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresCustomerActive} onChange={e => setForm((f: any) => ({...f, requiresCustomerActive: e.target.checked}))} />Requer cliente ativo</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresManagerApproval || false} onChange={e => setForm((f: any) => ({...f, requiresManagerApproval: e.target.checked}))} />Requer aprovacao</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({...f, active: e.target.checked}))} />Ativa</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Criar Regra'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!historyRule} onClose={() => setHistoryRule(null)} title={`Histórico — ${historyRule?.name || ''}`} size="lg">
        {historyLoading ? (
          <p className="text-sm text-gray-400 py-4">Carregando histórico...</p>
        ) : historyEntries.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Nenhuma alteração registrada ainda para esta regra.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {historyEntries.map(h => (
              <div key={h.id} className="border-l-2 border-gray-200 pl-3 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{actionLabel[h.action] || h.action}</span>
                  <span className="text-xs text-gray-400">{fmtDateTime(h.createdAt)}</span>
                </div>
                <div className="text-xs text-gray-400">por {h.user?.name || h.user?.email || 'sistema'}</div>
                {renderChanges(h)}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
