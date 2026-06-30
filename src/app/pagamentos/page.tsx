'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Table, { Tr, Td } from '@/components/ui/Table'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { money, date, monthYear } from '@/lib/formatters'

const batchStatus: Record<string, { label: string; color: any }> = {
  OPEN: { label: 'Em aberto', color: 'blue' },
  PENDING_APPROVAL: { label: 'Aguard. aprovacao', color: 'yellow' },
  APPROVED: { label: 'Aprovado', color: 'green' },
  PAID: { label: 'Pago', color: 'gray' },
  CANCELLED: { label: 'Cancelado', color: 'red' },
}

export default function PagamentosPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [released, setReleased] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [competence, setCompetence] = useState(new Date().toISOString().slice(0, 7))
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/payments/batches'), api.get('/payments/released')])
      .then(([b, r]) => { setBatches(b.data); setReleased(r.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleSelect = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const handleCreate = async () => {
    if (selected.length === 0) return alert('Selecione pelo menos uma comissao')
    setSaving(true)
    try {
      await api.post('/payments/batches', { competence, commissionIds: selected })
      setShowModal(false); setSelected([]); load()
    } catch (e: any) { alert(e.response?.data?.message || 'Erro') }
    finally { setSaving(false) }
  }

  const handleApprove = async (id: string) => {
    if (!confirm('Aprovar este lote?')) return
    await api.patch(`/payments/batches/${id}/approve`)
    load()
  }

  const handlePay = async (id: string) => {
    if (!confirm('Marcar este lote como PAGO? Esta acao e irreversivel.')) return
    await api.patch(`/payments/batches/${id}/mark-paid`)
    load()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        description="Gere e controle lotes de pagamento de comissoes"
        action={<button onClick={() => setShowModal(true)} className="btn-primary">+ Novo Lote</button>}
      />

      <div className="card overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Lotes de Pagamento</h2>
        </div>
        {batches.length === 0 ? (
          <EmptyState icon="💳" title="Nenhum lote criado" description="Crie um lote para agrupar comissoes liberadas e gerar pagamentos." />
        ) : (
          <Table headers={['Competencia', 'Total Bruto', 'Itens', 'Status', 'Criado em', 'Acoes']}>
            {batches.map((b: any) => {
              const st = batchStatus[b.status] || { label: b.status, color: 'gray' }
              return (
                <Tr key={b.id}>
                  <Td><div className="font-medium">{monthYear(b.competence)}</div></Td>
                  <Td><div className="font-semibold text-gray-900">{money(b.totalGross)}</div></Td>
                  <Td><div className="text-sm text-gray-500">{b.items?.length || 0} pagamentos</div></Td>
                  <Td><Badge color={st.color}>{st.label}</Badge></Td>
                  <Td><div className="text-sm text-gray-400">{date(b.createdAt)}</div></Td>
                  <Td>
                    <div className="flex gap-2">
                      {b.status === 'OPEN' && <button onClick={() => handleApprove(b.id)} className="text-xs btn-secondary py-1 px-2">Aprovar</button>}
                      {b.status === 'APPROVED' && <button onClick={() => handlePay(b.id)} className="text-xs btn-primary py-1 px-2">Marcar Pago</button>}
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo Lote de Pagamento" size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">Competencia</label>
            <input type="month" className="input" value={competence} onChange={e => setCompetence(e.target.value)} />
          </div>
          <div>
            <label className="label mb-2 block">Comissoes Liberadas ({released.length})</label>
            {released.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">Nenhuma comissao liberada para pagamento</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-100 rounded-lg p-2">
                {released.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{c.seller?.name || c.partner?.name || '—'}</div>
                      <div className="text-xs text-gray-400">{c.saleItem?.product?.name} • {c.sale?.customer?.companyName}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{money(c.amount)}</div>
                  </label>
                ))}
              </div>
            )}
            {selected.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                {selected.length} selecionada(s) — Total: <strong>{money(released.filter(r => selected.includes(r.id)).reduce((s: number, c: any) => s + Number(c.amount), 0))}</strong>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleCreate} disabled={saving || selected.length === 0} className="btn-primary flex-1">
              {saving ? 'Criando...' : `Criar Lote (${selected.length})`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
