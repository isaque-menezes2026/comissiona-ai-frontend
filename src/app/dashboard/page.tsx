'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { money, date, monthYear, commissionStatus, saleStatus, forecastStatusLabel } from '@/lib/formatters'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [mySummary, setMySummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const calls: Promise<any>[] = [
      api.get('/reports/dashboard'),
      api.get('/sales?limit=5'),
    ]
    if (user?.sellerId) calls.push(api.get('/commissions/my-summary'))

    Promise.all(calls).then(([r, s, my]) => {
      setData(r.data)
      setSales(Array.isArray(s.data) ? s.data.slice(0, 5) : [])
      if (my) setMySummary(my.data)
    }).finally(() => setLoading(false))
  }, [user?.sellerId])

  if (loading) return <LoadingSpinner />

  const predicted = Number(data?.predicted?._sum?.amount || 0)
  const released = Number(data?.released?._sum?.amount || 0)
  const paid = Number(data?.paid?._sum?.amount || 0)

  // Próximas comissões previstas a liberar (somente para vendedor), ordenadas pela data prevista
  const upcoming = (mySummary?.recent || [])
    .filter((c: any) => c.status === 'PREDICTED' && c.dateExpectedRelease)
    .sort((a: any, b: any) => new Date(a.dateExpectedRelease).getTime() - new Date(b.dateExpectedRelease).getTime())
    .slice(0, 5)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bom dia{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Aqui está o resumo do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Comissões Previstas" value={money(predicted)} sub={`${data?.predicted?._count || 0} comissões`} color="blue" icon="📋" />
        <StatCard label="Liberadas p/ Pagamento" value={money(released)} sub={`${data?.released?._count || 0} comissões`} color="green" icon="✅" />
        <StatCard label="Total Pago" value={money(paid)} sub={`${data?.paid?._count || 0} comissões`} color="gray" icon="💰" />
        <StatCard label="Total em Circulação" value={money(predicted + released)} sub="Previstas + Liberadas" color="yellow" icon="🔄" />
      </div>

      {released > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <div className="font-semibold text-green-800">
                {money(released)} aguardando pagamento
              </div>
              <div className="text-sm text-green-600">{data?.released?._count} comissões liberadas prontas para gerar lote de pagamento</div>
            </div>
            <a href="/pagamentos" className="ml-auto btn-primary text-sm py-2">Gerar Lote</a>
          </div>
        </div>
      )}

      {user?.sellerId && (
        <div className="card p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Suas próximas comissões</h2>
          <p className="text-xs text-gray-400 mb-4">Quanto, por qual venda, qual produto, qual regra e quando você deve receber</p>
          {upcoming.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">Nenhuma comissão prevista no momento.</div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{money(c.amount)} — {c.saleItem?.product?.name || 'Produto'}</div>
                    <div className="text-xs text-gray-500">Cliente: {c.sale?.customer?.companyName || '—'}</div>
                    <div className="text-xs text-gray-400">Motivo: {c.forecastReason || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-900">Previsão: {monthYear(c.expectedPaymentCompetence)}</div>
                    <div className="text-xs text-gray-400">{date(c.dateExpectedRelease)}</div>
                    <div className="text-xs text-blue-500 mt-0.5">{forecastStatusLabel[c.forecastStatus] || 'Aguardando liberação'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Vendas Recentes</h2>
          {sales.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma venda cadastrada</div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale: any) => {
                const st = saleStatus[sale.status] || { label: sale.status, color: 'gray' }
                return (
                  <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{sale.customer?.companyName}</div>
                      <div className="text-xs text-gray-400">{sale.seller?.name} • {date(sale.saleDate)}</div>
                    </div>
                    <Badge color={st.color as any}>{st.label}</Badge>
                  </div>
                )
              })}
              <a href="/vendas" className="block text-center text-sm text-blue-600 hover:underline pt-2">Ver todas as vendas →</a>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Comissões por Status</h2>
          {data?.byStatus?.length > 0 ? (
            <div className="space-y-3">
              {data.byStatus.map((s: any) => {
                const st = commissionStatus[s.status] || { label: s.status, color: 'gray' }
                return (
                  <div key={s.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge color={st.color as any}>{st.label}</Badge>
                      <span className="text-xs text-gray-400">{s._count} registros</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{money(s._sum?.amount)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma comissão calculada ainda</div>
          )}
        </div>
      </div>
    </div>
  )
}
