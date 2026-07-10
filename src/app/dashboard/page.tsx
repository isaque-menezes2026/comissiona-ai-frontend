'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { money, date, monthYear, commissionStatus, saleStatus, forecastStatusLabel } from '@/lib/formatters'

const isAdmin = (role: string) => ['ADMIN', 'SALES_MANAGER', 'FINANCIAL'].includes(role)

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [mySummary, setMySummary] = useState<any>(null)
  const [myGoals, setMyGoals] = useState<any[]>([])
  const [ranking, setRanking] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const from = `${periodKey}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const to = `${periodKey}-${String(lastDay).padStart(2, '0')}`

    const calls: Promise<any>[] = [
      api.get('/reports/dashboard'),
      api.get('/sales?limit=5'),
    ]

    if (user?.sellerId) {
      calls.push(api.get('/commissions/my-summary'))
      calls.push(api.get(`/goals/progress?periodType=monthly&periodKey=${periodKey}`))
    }

    if (user?.role && isAdmin(user.role)) {
      calls.push(api.get('/reports/ranking'))
      calls.push(api.get(`/reports/by-product?from=${from}&to=${to}`))
    }

    Promise.all(calls).then((results) => {
      setData(results[0].data)
      setSales(Array.isArray(results[1].data) ? results[1].data.slice(0, 5) : [])
      let idx = 2
      if (user?.sellerId) {
        setMySummary(results[idx]?.data)
        idx++
        const goals = Array.isArray(results[idx]?.data) ? results[idx].data : []
        // Metas do vendedor logado ou metas gerais sem vendedor específico
        setMyGoals(goals.filter((g: any) => g.sellerId === user.sellerId || !g.sellerId))
        idx++
      }
      if (user?.role && isAdmin(user.role)) {
        setRanking(Array.isArray(results[idx]?.data) ? results[idx].data.slice(0, 5) : [])
        idx++
        setTopProducts(Array.isArray(results[idx]?.data) ? results[idx].data.slice(0, 5) : [])
      }
    }).finally(() => setLoading(false))
  }, [user?.sellerId, user?.role])

  if (loading) return <LoadingSpinner />

  // ─── Totais gerais (gestão) ───────────────────────────────────────
  const predicted = Number(data?.predicted?._sum?.amount || 0)
  const released = Number(data?.released?._sum?.amount || 0)
  const paid = Number(data?.paid?._sum?.amount || 0)
  const mrr = Number(data?.mrr || 0)
  const revenueThisMonth = Number(data?.revenueThisMonth || 0)
  const commissionsThisMonth = Number(data?.commissionsThisMonth || 0)
  const commissionCostPct = revenueThisMonth > 0
    ? ((commissionsThisMonth / revenueThisMonth) * 100).toFixed(1)
    : '0.0'

  // ─── Dados pessoais do vendedor ───────────────────────────────────
  const myPredicted = Number(mySummary?.predicted?._sum?.amount || 0)
  const myReleased = Number(mySummary?.released?._sum?.amount || 0)
  const myPaid = Number(mySummary?.paid?._sum?.amount || 0)
  const myThisMonth = Number(mySummary?.thisMonth?._sum?.amount || 0)

  // Próximas comissões a liberar, ordenadas por data
  const upcoming = (mySummary?.recent || [])
    .filter((c: any) => c.status === 'PREDICTED' && c.dateExpectedRelease)
    .sort((a: any, b: any) => new Date(a.dateExpectedRelease).getTime() - new Date(b.dateExpectedRelease).getTime())
    .slice(0, 5)

  // Top produtos do vendedor (agregado das comissões recentes)
  const myTopProducts = (() => {
    const map: Record<string, { name: string; total: number; count: number }> = {}
    for (const c of mySummary?.recent || []) {
      const name = c.saleItem?.product?.name || 'Outros'
      if (!map[name]) map[name] = { name, total: 0, count: 0 }
      map[name].total += Number(c.amount)
      map[name].count++
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 4)
  })()

  // Meta principal do mês (receita, sem produto específico)
  const mainGoal = myGoals.find((g: any) => g.type === 'revenue' && !g.productId)
  const mainGoalPct = mainGoal ? Math.min(mainGoal.percentage, 100) : null
  const gapToGoal = mainGoal ? Math.max(0, Number(mainGoal.targetValue) - (mainGoal.achieved || 0)) : 0

  // Posição do vendedor logado no ranking
  const myRankPos = ranking.find((r: any) => r.sellerId === user?.sellerId)?.position

  const rankMedal = (pos: number) => {
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return `#${pos}`
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bom dia{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          VISÃO DO VENDEDOR (quando o usuário tem sellerId)
      ═══════════════════════════════════════════════════════════ */}
      {user?.sellerId && (
        <>
          {/* Cards pessoais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Minhas Previstas" value={money(myPredicted)} sub={`${mySummary?.predicted?._count || 0} comissões`} color="blue" icon="📋" />
            <StatCard label="Liberadas p/ Receber" value={money(myReleased)} sub={`${mySummary?.released?._count || 0} comissões`} color="green" icon="✅" />
            <StatCard label="Total Recebido" value={money(myPaid)} sub={`${mySummary?.paid?._count || 0} pagas`} color="gray" icon="💰" />
            <StatCard label="Previsão este Mês" value={money(myThisMonth)} sub="competência atual" color="yellow" icon="📅" />
          </div>

          {/* Meta + Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {mainGoal ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">🎯 Meta do Mês</h2>
                  <span className={`text-2xl font-black ${mainGoalPct! >= 100 ? 'text-green-600' : mainGoalPct! >= 70 ? 'text-yellow-500' : 'text-indigo-600'}`}>
                    {mainGoalPct?.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
                  <div
                    className={`h-3 rounded-full transition-all ${mainGoalPct! >= 100 ? 'bg-green-500' : mainGoalPct! >= 70 ? 'bg-yellow-400' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(mainGoalPct!, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-3">
                  <span>Alcançado: <strong>{money(mainGoal.achieved)}</strong></span>
                  <span>Meta: <strong>{money(Number(mainGoal.targetValue))}</strong></span>
                </div>
                {mainGoalPct! >= 100 ? (
                  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs font-semibold text-green-700">🏆 Meta atingida! Parabéns!</p>
                  </div>
                ) : (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-indigo-700">
                      💡 <strong>Faltam {money(gapToGoal)}</strong> para atingir sua meta deste mês
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 flex flex-col justify-center">
                <p className="text-sm font-semibold text-indigo-800 mb-2">
                  💰 {money(myPredicted)} em comissões esperando por você
                </p>
                <p className="text-xs text-indigo-600">
                  {myReleased > 0
                    ? `${money(myReleased)} já estão liberadas para pagamento.`
                    : 'Continue vendendo para liberar mais comissões!'}
                </p>
              </div>
            )}

            {/* Posição no ranking */}
            <div className="card p-5 flex flex-col justify-center items-center text-center">
              {myRankPos ? (
                <>
                  <div className="text-5xl font-black text-indigo-600 leading-none mb-1">
                    {myRankPos <= 3 ? rankMedal(myRankPos) : `#${myRankPos}`}
                  </div>
                  {myRankPos > 3 && <div className="text-xs text-gray-500 mt-1">no ranking de comissões</div>}
                  {myRankPos <= 3 && <div className="text-sm font-semibold text-gray-700 mt-1">#{myRankPos} no ranking</div>}
                  <p className="text-xs text-gray-400 mt-1">todos os períodos</p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">🏅</div>
                  <p className="text-sm text-gray-500">Faça sua primeira venda</p>
                  <p className="text-xs text-gray-400 mt-1">e apareça no ranking!</p>
                </>
              )}
            </div>
          </div>

          {/* Próximas comissões a liberar */}
          <div className="card p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Suas próximas comissões</h2>
            <p className="text-xs text-gray-400 mb-4">Por venda, produto, motivo e quando deve receber</p>
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

          {/* Produtos que mais geram comissão */}
          {myTopProducts.length > 0 && (
            <div className="card p-6 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Produtos que mais geram comissão</h2>
              <div className="space-y-3">
                {myTopProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center">{['🥇', '🥈', '🥉', '4️⃣'][i]}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-800">{p.name}</span>
                        <span className="font-semibold text-indigo-600">{money(p.total)}</span>
                      </div>
                      <span className="text-xs text-gray-400">{p.count} comissão{p.count !== 1 ? 'ões' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          VISÃO DA GESTÃO (ADMIN / SALES_MANAGER / FINANCIAL)
      ═══════════════════════════════════════════════════════════ */}
      {user?.role && isAdmin(user.role) && (
        <>
          <div className={user?.sellerId ? 'border-t border-gray-100 pt-6 mt-2' : ''}>
            {user?.sellerId && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Visão da Gestão</p>
            )}

            {/* Cards gerais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Comissões Previstas" value={money(predicted)} sub={`${data?.predicted?._count || 0} comissões`} color="blue" icon="📋" />
              <StatCard label="Liberadas p/ Pagamento" value={money(released)} sub={`${data?.released?._count || 0} comissões`} color="green" icon="✅" />
              <StatCard label="Total Pago" value={money(paid)} sub={`${data?.paid?._count || 0} comissões`} color="gray" icon="💰" />
              <StatCard label="Em Circulação" value={money(predicted + released)} sub="Previstas + Liberadas" color="yellow" icon="🔄" />
            </div>

            {/* MRR / Receita / Custo comercial */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="card p-4">
                <p className="text-xs text-gray-400 mb-1">MRR — Receita Recorrente</p>
                <p className="text-xl font-bold text-gray-900">{money(mrr)}</p>
                <p className="text-xs text-gray-400 mt-1">mensalidades líquidas ativas</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-400 mb-1">Receita Bruta este Mês</p>
                <p className="text-xl font-bold text-gray-900">{money(revenueThisMonth)}</p>
                <p className="text-xs text-gray-400 mt-1">vendas fechadas no mês</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-400 mb-1">Custo Comercial / Receita</p>
                <p className="text-xl font-bold text-gray-900">{commissionCostPct}%</p>
                <p className="text-xs text-gray-400 mt-1">{money(commissionsThisMonth)} em comissões no mês</p>
              </div>
            </div>

            {/* Alerta: liberadas esperando pagamento */}
            {released > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <div className="font-semibold text-green-800">{money(released)} aguardando pagamento</div>
                    <div className="text-sm text-green-600">{data?.released?._count} comissões liberadas prontas para gerar lote</div>
                  </div>
                  <Link href="/pagamentos" className="ml-auto btn-primary text-sm py-2">Gerar Lote</Link>
                </div>
              </div>
            )}

            {/* Ranking + Top produtos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {ranking.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">🏆 Ranking de Comissões</h2>
                  <div className="space-y-3">
                    {ranking.map((r: any) => (
                      <div key={r.sellerId} className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center font-bold text-gray-600">
                          {rankMedal(r.position)}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-800">{r.sellerName}</span>
                            <span className="font-semibold text-indigo-600">{money(r.totalCommission)}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {r.team && <span>{r.team} · </span>}
                            <span>{r.count} comissão{r.count !== 1 ? 'ões' : ''}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/relatorios" className="block text-center text-sm text-blue-600 hover:underline pt-4 border-t border-gray-50 mt-4">
                    Ver relatório completo →
                  </Link>
                </div>
              )}

              {topProducts.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">📦 Top Produtos este Mês</h2>
                  <div className="space-y-3">
                    {topProducts.map((p: any, i: number) => (
                      <div key={p.productName} className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-800">{p.productName}</span>
                            <span className="font-semibold text-indigo-600">{money(p.total)}</span>
                          </div>
                          <span className="text-xs text-gray-400">{p.count} comissão{p.count !== 1 ? 'ões' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vendas recentes + Comissões por status */}
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
                            <div className="text-xs text-gray-400">{sale.seller?.name} · {date(sale.saleDate)}</div>
                            {sale.contractFileUrl && (
                              <a
                                href={sale.contractFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                📄 Ver contrato
                              </a>
                            )}
                          </div>
                          <Badge color={st.color as any}>{st.label}</Badge>
                        </div>
                      )
                    })}
                    <Link href="/vendas" className="block text-center text-sm text-blue-600 hover:underline pt-2">Ver todas →</Link>
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
        </>
      )}

      {/* Fallback: usuário sem sellerId e sem perfil admin (ex: PARTNER puro) */}
      {!user?.sellerId && !(user?.role && isAdmin(user.role)) && (
        <div className="card p-10 text-center text-gray-400">
          <p className="text-lg">👋 Bem-vindo ao Comissiona AI</p>
          <p className="text-sm mt-2">Entre em contato com o administrador para configurar seu acesso.</p>
        </div>
      )}
    </div>
  )
}
