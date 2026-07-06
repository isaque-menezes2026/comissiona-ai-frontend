'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import { money, date } from '@/lib/formatters'

const periodTypes = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'yearly', label: 'Anual' },
]

const goalTypes = [
  { value: 'revenue', label: 'Receita (R$)' },
  { value: 'quantity', label: 'Quantidade de vendas' },
]

function getCurrentPeriodKey(type: string) {
  const now = new Date()
  const year = now.getFullYear()
  if (type === 'monthly') return `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (type === 'yearly') return `${year}`
  if (type === 'quarterly') return `${year}-Q${Math.floor(now.getMonth() / 3) + 1}`
  if (type === 'semiannual') return `${year}-H${now.getMonth() < 6 ? 1 : 2}`
  if (type === 'weekly') {
    const jan1 = new Date(year, 0, 1)
    const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000)
    const week = Math.ceil((days + jan1.getDay() + 1) / 7)
    return `${year}-W${week}`
  }
  return `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function periodOptions(type: string, year: number) {
  if (type === 'monthly') return Array.from({ length: 12 }, (_, i) => ({ value: `${year}-${String(i+1).padStart(2,'0')}`, label: `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]}/${year}` }))
  if (type === 'quarterly') return [1,2,3,4].map(q => ({ value: `${year}-Q${q}`, label: `${q}º Trimestre ${year}` }))
  if (type === 'semiannual') return [1,2].map(h => ({ value: `${year}-H${h}`, label: `${h}º Semestre ${year}` }))
  if (type === 'yearly') return [{ value: `${year}`, label: `Ano ${year}` }]
  if (type === 'weekly') return Array.from({ length: 52 }, (_, i) => ({ value: `${year}-W${i+1}`, label: `Semana ${i+1}/${year}` }))
  return []
}

function shortPeriodLabel(periodType: string, periodKey: string) {
  if (periodType === 'monthly') {
    const [y, m] = periodKey.split('-')
    return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][Number(m) - 1] || m}/${y?.slice(2)}`
  }
  if (periodType === 'yearly') return periodKey
  if (periodType === 'quarterly') return periodKey.replace('-', ' ')
  if (periodType === 'semiannual') return periodKey.replace('-', ' ')
  if (periodType === 'weekly') return periodKey.split('-')[1] || periodKey
  return periodKey
}

function formatAchieved(value: number, type: string) {
  if (type === 'quantity') return `${value} venda${value === 1 ? '' : 's'}`
  return money(value)
}

const emptyForm = (periodType: string, periodKey: string) => ({
  periodType, periodKey, type: 'revenue', productId: '', targetValue: '', bonusAmount: '',
  startDate: '', endDate: '', active: true,
})

export default function MetasPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [periodType, setPeriodType] = useState('monthly')
  const [periodKey, setPeriodKey] = useState(getCurrentPeriodKey('monthly'))
  const [year] = useState(new Date().getFullYear())
  const [form, setForm] = useState<any>(emptyForm('monthly', getCurrentPeriodKey('monthly')))
  const [history, setHistory] = useState<Record<string, any[]>>({})

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/goals/progress?periodType=${periodType}&periodKey=${periodKey}`),
      api.get('/products'),
    ]).then(([g, p]) => {
      setGoals(g.data)
      setProducts(p.data)
      // Busca evolução (últimos 6 períodos) de cada meta em paralelo
      Promise.all(
        g.data.map((goal: any) =>
          api.get('/goals/history', {
            params: { periodType, periodKey, productId: goal.productId || '', sellerId: goal.sellerId || '', count: 6 },
          }).then((r: any) => [goal.id, r.data])
        )
      ).then((entries: any[]) => setHistory(Object.fromEntries(entries)))
    })
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [periodType, periodKey])

  const handlePeriodTypeChange = (type: string) => {
    setPeriodType(type)
    setPeriodKey(getCurrentPeriodKey(type))
  }

  const openCreateModal = () => {
    setEditingId(null)
    setForm(emptyForm(periodType, periodKey))
    setShowModal(true)
  }

  const openEditModal = (g: any) => {
    setEditingId(g.id)
    setForm({
      periodType: g.periodType,
      periodKey: g.periodKey,
      type: g.type || 'revenue',
      productId: g.productId || '',
      targetValue: g.targetValue,
      bonusAmount: g.bonusAmount || '',
      startDate: g.startDate ? g.startDate.slice(0, 10) : '',
      endDate: g.endDate ? g.endDate.slice(0, 10) : '',
      active: g.active !== false,
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = {
        ...form,
        productId: form.productId || null,
        targetValue: parseFloat(form.targetValue),
        bonusAmount: form.bonusAmount ? parseFloat(form.bonusAmount) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }
      if (editingId) {
        await api.patch(`/goals/${editingId}`, payload)
      } else {
        await api.post('/goals', payload)
      }
      setShowModal(false)
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Erro') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta meta definitivamente?')) return
    await api.delete(`/goals/${id}`)
    load()
  }

  const toggleActive = async (g: any) => {
    await api.patch(`/goals/${g.id}`, { active: !g.active })
    load()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Metas" description="Metas de receita ou quantidade por produto e período" action={<button onClick={openCreateModal} className="btn-primary">+ Nova Meta</button>} />

      <div className="flex items-center gap-3 mb-6">
        {periodTypes.map(pt => (
          <button key={pt.value} onClick={() => handlePeriodTypeChange(pt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodType === pt.value ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            {pt.label}
          </button>
        ))}
        <select className="input w-48 ml-2" value={periodKey} onChange={e => setPeriodKey(e.target.value)}>
          {periodOptions(periodType, year).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {goals.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-gray-400">Nenhuma meta configurada para este período.</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((g: any) => {
            const pct = Math.min(g.percentage || 0, 100)
            const color = pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-400' : pct >= 50 ? 'bg-blue-500' : 'bg-gray-300'
            const goalHistory = history[g.id] || []
            return (
              <div key={g.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {g.product?.color && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.product.color }} />}
                      <div className="font-semibold text-gray-900">{g.product?.name || 'Meta Geral'}</div>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {g.type === 'quantity' ? 'Quantidade' : 'Receita'}
                      </span>
                      <button onClick={() => toggleActive(g)}>
                        <Badge color={g.active === false ? 'gray' : 'green'}>{g.active === false ? 'Inativa' : 'Ativa'}</Badge>
                      </button>
                      {g.isValid === false && (
                        <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">Fora da validade</span>
                      )}
                    </div>
                    {(g.startDate || g.endDate) && (
                      <div className="text-xs text-gray-400 mt-1">
                        Válida: {g.startDate ? date(g.startDate) : '—'} até {g.endDate ? date(g.endDate) : '—'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{(g.percentage || 0).toFixed(0)}%</div>
                      {pct >= 100 && <div className="text-xs text-green-600">Meta atingida!</div>}
                    </div>
                    <button onClick={() => openEditModal(g)} className="text-gray-300 hover:text-blue-500 text-sm" title="Editar">✎</button>
                    <button onClick={() => handleDelete(g.id)} className="text-gray-300 hover:text-red-500 text-sm" title="Excluir">×</button>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
                  <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Realizado: <strong className="text-gray-900">{formatAchieved(g.achieved, g.type)}</strong></span>
                  <span>Meta: <strong className="text-gray-900">{formatAchieved(Number(g.targetValue), g.type)}</strong></span>
                </div>
                {g.bonusAmount && (
                  <div className="mt-3 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                    Bônus ao atingir: {money(g.bonusAmount)}
                  </div>
                )}

                {goalHistory.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-50">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Evolução</div>
                    <div className="flex items-end gap-1.5 h-14">
                      {goalHistory.map((h: any) => {
                        const hpct = Math.min(h.percentage || 0, 100)
                        const barColor = !h.hasGoal ? 'bg-gray-100' : hpct >= 100 ? 'bg-green-400' : hpct >= 50 ? 'bg-blue-400' : 'bg-gray-300'
                        return (
                          <div key={h.periodKey} className="flex-1 flex flex-col items-center justify-end h-full" title={`${shortPeriodLabel(periodType, h.periodKey)}: ${h.hasGoal ? hpct.toFixed(0) + '%' : 'sem meta'}`}>
                            <div className={`w-full rounded-t ${barColor}`} style={{ height: `${Math.max(hpct, h.hasGoal ? 6 : 3)}%` }} />
                            <div className="text-[10px] text-gray-400 mt-1">{shortPeriodLabel(periodType, h.periodKey)}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Meta' : 'Nova Meta'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Produto (deixe em branco para meta geral)</label>
            <select className="input" value={form.productId || ''} onChange={e => setForm((f: any) => ({...f, productId: e.target.value}))}>
              <option value="">Meta Geral (sem produto)</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              {products.flatMap((p: any) => p.modules || []).map((m: any) => <option key={m.id} value={m.id}>↳ {m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo de meta *</label>
            <select className="input" value={form.type} onChange={e => setForm((f: any) => ({...f, type: e.target.value}))}>
              {goalTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de período</label>
              <select className="input" value={form.periodType} onChange={e => setForm((f: any) => ({...f, periodType: e.target.value, periodKey: getCurrentPeriodKey(e.target.value)}))}>
                {periodTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Período</label>
              <select className="input" value={form.periodKey} onChange={e => setForm((f: any) => ({...f, periodKey: e.target.value}))}>
                {periodOptions(form.periodType, year).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">{form.type === 'quantity' ? 'Meta de Quantidade (nº de vendas) *' : 'Meta de Receita (R$) *'}</label>
            <input type="number" className="input" min={0} step={form.type === 'quantity' ? 1 : 0.01} value={form.targetValue} onChange={e => setForm((f: any) => ({...f, targetValue: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Bônus ao atingir (R$, opcional)</label>
            <input type="number" className="input" min={0} step={0.01} value={form.bonusAmount} onChange={e => setForm((f: any) => ({...f, bonusAmount: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Válida a partir de (opcional)</label>
              <input type="date" className="input" value={form.startDate || ''} onChange={e => setForm((f: any) => ({...f, startDate: e.target.value}))} />
            </div>
            <div>
              <label className="label">Válida até (opcional)</label>
              <input type="date" className="input" value={form.endDate || ''} onChange={e => setForm((f: any) => ({...f, endDate: e.target.value}))} />
            </div>
          </div>
          {editingId && (
            <div className="flex items-center gap-2">
              <input id="goal-active" type="checkbox" checked={!!form.active} onChange={e => setForm((f: any) => ({...f, active: e.target.checked}))} />
              <label htmlFor="goal-active" className="label mb-0">Ativa</label>
            </div>
          )}
          <p className="text-xs text-gray-400">
            Se já existir uma meta ativa para o mesmo produto e período, ela será inativada automaticamente ao salvar esta.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar Meta'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
