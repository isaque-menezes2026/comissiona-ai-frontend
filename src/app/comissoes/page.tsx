'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Table, { Tr, Td } from '@/components/ui/Table'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import StatCard from '@/components/ui/StatCard'
import { money, date, monthYear, commissionStatus, commissionType, forecastStatusLabel } from '@/lib/formatters'

export default function ComissoesPage() {
  const [commissions, setCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      api.get('/commissions' + (filter ? `?status=${filter}` : '')),
      api.get('/reports/dashboard'),
    ]).then(([c, d]) => { setCommissions(c.data); setStats(d.data) })
    .finally(() => setLoading(false))
  }, [filter])

  const handleProcessInvoice = async (commissionSaleId: string) => {
    const installment = prompt('Qual numero da parcela paga?')
    const amount = prompt('Qual valor pago?')
    if (!installment || !amount) return
    try {
      await api.post('/commissions/process-invoice', { saleId: commissionSaleId, installmentNum: parseInt(installment), paidAmount: parseFloat(amount) })
      alert('Parcela processada! Comissoes atualizadas.')
      setLoading(true)
      api.get('/commissions').then(r => setCommissions(r.data)).finally(() => setLoading(false))
    } catch (e: any) { alert(e.response?.data?.message || 'Erro') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Comissoes" description="Acompanhe todas as comissoes calculadas pelo sistema" />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Previstas" value={money(stats.predicted?._sum?.amount)} sub={`${stats.predicted?._count} registros`} color="blue" icon="📋" />
          <StatCard label="Liberadas" value={money(stats.released?._sum?.amount)} sub={`${stats.released?._count} registros`} color="green" icon="✅" />
          <StatCard label="Pagas" value={money(stats.paid?._sum?.amount)} sub={`${stats.paid?._count} registros`} color="gray" icon="💰" />
          <div className="card p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Processar Fatura</div>
            <p className="text-xs text-gray-500 mb-3">Marque faturas como pagas para liberar comissoes automaticamente</p>
            <button onClick={() => {
              const saleId = prompt('ID da venda:')
              if (saleId) handleProcessInvoice(saleId)
            }} className="btn-secondary w-full text-sm py-2">Registrar Pagamento</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex gap-2 p-4 border-b border-gray-100">
          {['', 'PREDICTED', 'RELEASED', 'PAID', 'BLOCKED', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === '' ? 'Todas' : commissionStatus[s]?.label || s}
            </button>
          ))}
        </div>
        {commissions.length === 0 ? (
          <EmptyState icon="💰" title="Nenhuma comissao encontrada" description="As comissoes sao calculadas automaticamente quando uma venda e cadastrada." />
        ) : (
          <Table headers={['Beneficiario', 'Produto', 'Cliente', 'Tipo', 'Valor', 'Previsao', 'Status']}>
            {commissions.map((c: any) => {
              const st = commissionStatus[c.status] || { label: c.status, color: 'gray' }
              const bene = c.seller?.name || c.partner?.name || c.employee?.name || '—'
              return (
                <Tr key={c.id}>
                  <Td><div className="font-medium">{bene}</div></Td>
                  <Td><div className="text-sm text-gray-600">{c.saleItem?.product?.name || '—'}</div></Td>
                  <Td><div className="text-sm text-gray-500">{c.sale?.customer?.companyName || '—'}</div></Td>
                  <Td>
                    <div className="text-xs text-gray-400">{commissionType[c.commissionType] || c.commissionType}</div>
                    {c.rule?.name && <div className="text-xs text-gray-300">{c.rule.name}</div>}
                  </Td>
                  <Td><div className="font-semibold text-gray-900">{money(c.amount)}</div></Td>
                  <Td>
                    {c.dateExpectedRelease ? (
                      <div>
                        <div className="text-xs font-medium text-gray-900">{date(c.dateExpectedRelease)} <span className="text-gray-400">({monthYear(c.expectedPaymentCompetence)})</span></div>
                        <div className="text-xs text-gray-500">{c.forecastReason}</div>
                        {c.forecastStatus && <div className="text-xs text-blue-500">{forecastStatusLabel[c.forecastStatus] || c.forecastStatus}</div>}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </Td>
                  <Td><Badge color={st.color as any}>{st.label}</Badge></Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </div>
    </div>
  )
}
