'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import { money } from '@/lib/formatters'

const periodTypes = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'yearly', label: 'Anual' },
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

export default function MetasPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [periodType, setPeriodType] = useState('monthly')
  const [periodKey, setPeriodKey] = useState(getCurrentPeriodKey('monthly'))
  const [year] = useState(new Date().getFullYear())
  const [form, setForm] = useState<any>({ periodType: 'monthly', periodKey: getCurrentPeriodKey('monthly'), type: 'revenue' })

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/goals/progress?periodType=${periodType}&periodKey=${periodKey}`),
      api.get('/products'),
    ]).then(([g, p]) => { setGoals(g.data); setProducts(p.data) })
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [periodType, periodKey])

  const handlePeriodTypeChange = (type: string) => {
    setPeriodType(type)
    setPeriodKey(getCurrentPeriodKey(type))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/goals', { ...form, periodType, periodKey })
      setShowModal(false)
      setForm({ periodType, periodKey, type: 'revenue' })
      load()
    } catch (err: any) { alert(err.response?.data?.message || 'Erro') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta meta?')) return
    await api.delete(`/goals/${id}`)
    load()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Metas" description="Metas de receita por produto e período" action={<button onClick={() => setShowModal(true)} className="btn-primary">+ Nova Meta</button>} />

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
            return (
              <div key={g.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {g.product?.color && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.product.color }} />}
                      <div className="font-semibold text-gray-900">{g.product?.name || 'Meta Geral'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{(g.percentage || 0).toFixed(0)}%</div>
                      {pct >= 100 && <div className="text-xs text-green-600">Meta atingida!</div>}
                    </div>
                    <button onClick={() => handleDelete(g.id)} className="text-gray-300 hover:text-red-500 text-sm">×</button>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
                  <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Realizado: <strong className="text-gray-900">{money(g.achieved)}</strong></span>
                  <span>Meta: <strong className="text-gray-900">{money(g.targetValue)}</strong></span>
                </div>
                {g.bonusAmount && (
                  <div className="mt-3 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                    Bônus ao atingir: {money(g.bonusAmount)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Meta">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Produto (deixe em branco para meta geral)</label>
            <select className="input" value={form.productId || ''} onChange={e => setForm((f: any) => ({...f, productId: e.target.value || null}))}>
              <option value="">Meta Geral (sem produto)</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              {products.flatMap((p: any) => p.modules || []).map((m: any) => <option key={m.id} value={m.id}>↳ {m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Período: {periodTypes.find(p => p.value === periodType)?.label} — {periodOptions(periodType, year).find(o => o.value === periodKey)?.label}</label>
          </div>
          <div>
            <label className="label">Meta de Receita (R$) *</label>
            <input type="number" className="input" min={0} step={0.01} value={form.targetValue || ''} onChange={e => setForm((f: any) => ({...f, targetValue: parseFloat(e.target.value)}))} required />
          </div>
          <div>
            <label className="label">Bônus ao atingir (R$, opcional)</label>
            <input type="number" className="input" min={0} step={0.01} value={form.bonusAmount || ''} onChange={e => setForm((f: any) => ({...f, bonusAmount: parseFloat(e.target.value)}))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Criar Meta'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
