'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import { money } from '@/lib/formatters'

export default function MetasPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [form, setForm] = useState<any>({ type: 'revenue', month })

  const load = () => {
    setLoading(true)
    Promise.all([api.get(`/goals/progress?month=${month}`), api.get('/people/sellers')])
      .then(([g, s]) => { setGoals(g.data); setSellers(s.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [month])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/goals', { ...form, month }); setShowModal(false); load() }
    catch (err: any) { alert(err.response?.data?.message || 'Erro') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Metas" description="Configure e acompanhe as metas da equipe" action={<button onClick={() => setShowModal(true)} className="btn-primary">+ Nova Meta</button>} />

      <div className="flex items-center gap-4 mb-6">
        <label className="label mb-0">Mes:</label>
        <input type="month" className="input w-40" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      {goals.length === 0 ? (
        <div className="card p-12 text-center"><p className="text-gray-400">Nenhuma meta configurada para este mes.</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((g: any) => {
            const pct = Math.min(g.percentage || 0, 100)
            const color = pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-400' : pct >= 50 ? 'bg-blue-500' : 'bg-gray-300'
            return (
              <div key={g.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-gray-900">{g.seller?.name || g.teamName || 'Geral'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{g.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{pct.toFixed(0)}%</div>
                    {pct >= 100 && <div className="text-xs text-green-600">Meta atingida!</div>}
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3">
                  <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Realizado: <strong className="text-gray-900">{g.achieved}</strong></span>
                  <span>Meta: <strong className="text-gray-900">{Number(g.targetValue)}</strong></span>
                </div>
                {g.bonusAmount && (
                  <div className="mt-3 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                    Bonus ao atingir: {money(g.bonusAmount)}
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
            <label className="label">Vendedor (ou deixe em branco para equipe)</label>
            <select className="input" value={form.sellerId || ''} onChange={e => setForm((f: any) => ({...f, sellerId: e.target.value || null}))}>
              <option value="">Equipe geral</option>
              {sellers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Meta</label>
              <select className="input" value={form.type} onChange={e => setForm((f: any) => ({...f, type: e.target.value}))}>
                <option value="revenue">Receita</option>
                <option value="sales_count">Qtd. de Vendas</option>
                <option value="mrr">MRR</option>
                <option value="implantation">Implantacao</option>
              </select>
            </div>
            <div>
              <label className="label">Valor da Meta *</label>
              <input type="number" className="input" min={0} step={0.01} value={form.targetValue || ''} onChange={e => setForm((f: any) => ({...f, targetValue: parseFloat(e.target.value)}))} required />
            </div>
            <div>
              <label className="label">Bonus ao atingir (R$)</label>
              <input type="number" className="input" min={0} step={0.01} value={form.bonusAmount || ''} onChange={e => setForm((f: any) => ({...f, bonusAmount: parseFloat(e.target.value)}))} />
            </div>
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
