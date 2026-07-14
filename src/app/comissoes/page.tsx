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
  const [allCommissions, setAllCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [marking, setMarking] = useState(false)
  const [refreshingText, setRefreshingText] = useState(false)
  const [fixingScoping, setFixingScoping] = useState(false)
  // Por padrão, oculta as canceladas na aba "Todas" (ainda podem ser vistas
  // na aba "Cancelada"). Não há exclusão por aqui de propósito: exclusão de
  // comissão deve ser feita a partir da venda de origem, não nesta tela.
  const [hideCancelled, setHideCancelled] = useState(true)
  // Filtros novos para facilitar a rotina de pagamento: por beneficiário
  // específico e por urgência de vencimento (o que já venceu ou vence
  // dentro do mês corrente, com base em dateExpectedRelease/expectedPaymentCompetence).
  const [beneficiaryFilter, setBeneficiaryFilter] = useState('')
  const [dueFilter, setDueFilter] = useState<'' | 'overdue' | 'thisMonth'>('')

  const load = () => {
    // O resumo por beneficiário sempre olha TODAS as comissões, independente
    // da aba de status selecionada na tabela abaixo — senão, ao filtrar por
    // "Previstas" por exemplo, o resumo ficaria incompleto/enganoso.
    const calls: any[] = [
      api.get('/commissions' + (filter ? `?status=${filter}` : '')),
      api.get('/reports/dashboard'),
    ]
    if (filter) calls.push(api.get('/commissions'))

    Promise.all(calls).then(([c, d, all]) => {
      setCommissions(c.data)
      setStats(d.data)
      setAllCommissions(filter ? all.data : c.data)
      setSelected(new Set())
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  // Comissões já pagas ou canceladas não podem ser selecionadas novamente
  const isSelectable = (c: any) => c.status !== 'PAID' && c.status !== 'CANCELLED'

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const selectableIds = visibleCommissions.filter(isSelectable).map(c => c.id)
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id))
    setSelected(allSelected ? new Set() : new Set(selectableIds))
  }

  const handleMarkPaid = async () => {
    if (selected.size === 0) return
    if (!confirm(`Marcar ${selected.size} comissão(ões) selecionada(s) como paga(s)?`)) return
    setMarking(true)
    try {
      const { data } = await api.patch('/commissions/mark-paid', { ids: Array.from(selected) })
      alert(data.message || 'Comissões atualizadas.')
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao marcar comissões como pagas.')
    } finally {
      setMarking(false)
    }
  }

  // Manutenção pontual: recalcula apenas o texto de previsão (forecastReason)
  // das comissões já existentes, para refletir o gatilho real da regra em vez
  // do texto genérico antigo. Não mexe em valor, status ou datas.
  const handleRefreshForecastText = async () => {
    setRefreshingText(true)
    try {
      const { data } = await api.patch('/commissions/refresh-forecast-text')
      alert(data.message || 'Textos de previsão atualizados.')
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao atualizar textos de previsão.')
    } finally {
      setRefreshingText(false)
    }
  }

  // Manutenção pontual: regras de comissão recorrente/percentual do vendedor
  // (ex: 3ª mensalidade 100%) estavam sem restrição de origem e valiam também
  // para vendas de parceiro/colaborador, pagando o vendedor duas vezes pela
  // mesma venda (o fixo de conversão E a comissão recorrente completa).
  // Restringe essas regras a "venda direta" e cancela as comissões pendentes
  // que ficaram indevidas por causa disso.
  const handleFixOriginScoping = async () => {
    if (!confirm('Isso vai restringir as regras recorrentes/percentuais do vendedor a "venda direta" e cancelar comissões pendentes que não deveriam ter sido geradas para vendas de parceiro/colaborador. Continuar?')) return
    setFixingScoping(true)
    try {
      const { data } = await api.patch('/commissions/fix-origin-scoping')
      alert(data.message || 'Regras corrigidas.')
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao corrigir escopo das regras.')
    } finally {
      setFixingScoping(false)
    }
  }

  if (loading) return <LoadingSpinner />

  // "Vencida" = já passou da data prevista de liberação/pagamento e ainda não
  // foi paga nem cancelada. "Este mês" = a competência prevista de pagamento
  // cai no mês corrente. Serve pra separar o que precisa de atenção AGORA do
  // que é só previsão distante.
  const today = new Date().toISOString().slice(0, 10)
  const thisMonthKey = new Date().toISOString().slice(0, 7)
  const isPendingPayment = (c: any) => c.status !== 'PAID' && c.status !== 'CANCELLED'
  const isOverdue = (c: any) => isPendingPayment(c) && !!c.dateExpectedRelease && c.dateExpectedRelease.slice(0, 10) < today
  const isDueThisMonth = (c: any) => isPendingPayment(c) && c.expectedPaymentCompetence === thisMonthKey
  const beneficiaryKey = (c: any) => {
    const bene = c.seller || c.partner || c.employee
    if (!bene) return null
    const type = c.seller ? 'Vendedor' : c.partner ? 'Parceiro' : 'Colaborador'
    return { key: `${type}-${bene.id}`, type, name: bene.name }
  }

  // Na aba "Todas", com o toggle ligado, some com as canceladas da lista
  // (elas continuam existindo e acessíveis pela aba "Cancelada"). Em seguida
  // aplica os filtros de beneficiário e de vencimento, que funcionam em
  // conjunto com a aba de status e entre si.
  const visibleCommissions = (filter === '' && hideCancelled
    ? commissions.filter((c: any) => c.status !== 'CANCELLED')
    : commissions
  ).filter((c: any) => {
    if (beneficiaryFilter) {
      const bk = beneficiaryKey(c)
      if (!bk || bk.key !== beneficiaryFilter) return false
    }
    if (dueFilter === 'overdue' && !isOverdue(c)) return false
    if (dueFilter === 'thisMonth' && !isDueThisMonth(c)) return false
    return true
  })

  const selectableCount = visibleCommissions.filter(isSelectable).length

  // Total vendido (com base nos itens de venda por trás das comissões listadas).
  // Deduplicado por saleItemId: um mesmo item de venda pode gerar mais de uma
  // comissão (ex: 1ª e 3ª mensalidade, vendedor + parceiro), então somar direto
  // pela linha da comissão contaria o mesmo valor de venda várias vezes.
  const uniqueSaleItems = new Map<string, any>()
  commissions.forEach((c: any) => {
    if (c.saleItem?.id && !uniqueSaleItems.has(c.saleItem.id)) {
      uniqueSaleItems.set(c.saleItem.id, c.saleItem)
    }
  })
  const totalVendidoLiquido = [...uniqueSaleItems.values()].reduce((sum, si) => sum + Number(si.netValue || 0), 0)
  const totalVendidoBruto = [...uniqueSaleItems.values()].reduce((sum, si) => sum + Number(si.grossValue || 0), 0)

  // Resumo por beneficiário: agrupa TODAS as comissões (não só as da aba/filtro
  // atual) por vendedor/parceiro/colaborador, somando por status. Cancelada não
  // entra no total, mas mostro à parte pra dar transparência de quanto foi
  // cancelado daquele beneficiário.
  const beneficiaryMap = new Map<string, { key: string; name: string; type: string; predicted: number; blocked: number; released: number; paid: number; cancelled: number; overdue: number; dueThisMonth: number; total: number; count: number }>()
  allCommissions.forEach((c: any) => {
    const bk = beneficiaryKey(c)
    if (!bk) return
    if (!beneficiaryMap.has(bk.key)) {
      beneficiaryMap.set(bk.key, { key: bk.key, name: bk.name, type: bk.type, predicted: 0, blocked: 0, released: 0, paid: 0, cancelled: 0, overdue: 0, dueThisMonth: 0, total: 0, count: 0 })
    }
    const entry = beneficiaryMap.get(bk.key)!
    const amount = Number(c.amount || 0)
    if (c.status === 'PREDICTED') entry.predicted += amount
    else if (c.status === 'BLOCKED') entry.blocked += amount
    else if (c.status === 'RELEASED') entry.released += amount
    else if (c.status === 'PAID') entry.paid += amount
    else if (c.status === 'CANCELLED') entry.cancelled += amount
    if (isOverdue(c)) entry.overdue += amount
    if (isDueThisMonth(c)) entry.dueThisMonth += amount
    if (c.status !== 'CANCELLED') { entry.total += amount; entry.count += 1 }
  })
  const beneficiarySummary = [...beneficiaryMap.values()].sort((a, b) => (b.overdue + b.dueThisMonth) - (a.overdue + a.dueThisMonth) || b.total - a.total)
  const beneficiaryOptions = [...beneficiaryMap.values()].sort((a, b) => a.name.localeCompare(b.name))

  // Total "a pagar agora" (vencido + dentro do mês corrente), sempre calculado
  // sobre TODAS as comissões (independe da aba/filtro selecionado), pra dar
  // um número confiável de referência pro financeiro.
  const totalOverdue = beneficiarySummary.reduce((sum, b) => sum + b.overdue, 0)
  const totalDueThisMonth = beneficiarySummary.reduce((sum, b) => sum + b.dueThisMonth, 0)
  const countOverdue = allCommissions.filter(isOverdue).length
  const countDueThisMonth = allCommissions.filter(isDueThisMonth).length

  return (
    <div>
      <PageHeader
        title="Comissoes"
        description="Acompanhe todas as comissoes calculadas pelo sistema"
        action={
          <div className="flex gap-2">
            <button onClick={handleFixOriginScoping} disabled={fixingScoping} className="btn-secondary text-xs py-1.5">
              {fixingScoping ? 'Corrigindo...' : 'Corrigir regras de origem (parceiro x direta)'}
            </button>
            <button onClick={handleRefreshForecastText} disabled={refreshingText} className="btn-secondary text-xs py-1.5">
              {refreshingText ? 'Atualizando...' : 'Atualizar textos de previsão'}
            </button>
          </div>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Previstas" value={money(stats.predicted?._sum?.amount)} sub={`${stats.predicted?._count} registros`} color="blue" icon="📋" />
          <StatCard label="Liberadas" value={money(stats.released?._sum?.amount)} sub={`${stats.released?._count} registros`} color="green" icon="✅" />
          <StatCard label="Pagas" value={money(stats.paid?._sum?.amount)} sub={`${stats.paid?._count} registros`} color="gray" icon="💰" />
          <div className="card p-5 flex flex-col justify-center">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Marcar como pagas</div>
            {selected.size > 0 ? (
              <>
                <p className="text-xs text-gray-500 mb-3">{selected.size} comissão(ões) selecionada(s)</p>
                <button onClick={handleMarkPaid} disabled={marking} className="btn-primary w-full text-sm py-2">
                  {marking ? 'Marcando...' : `Marcar ${selected.size} como paga(s)`}
                </button>
              </>
            ) : (
              <p className="text-xs text-gray-400">Marque o check das comissões na tabela abaixo e clique aqui para dar baixa no pagamento.</p>
            )}
          </div>
        </div>
      )}

      <div className="card p-5 mb-6">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">A Pagar Agora</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setFilter(''); setDueFilter(dueFilter === 'overdue' ? '' : 'overdue') }}
            className={`text-left p-4 rounded-lg border transition-colors ${dueFilter === 'overdue' ? 'border-red-400 bg-red-50' : 'border-red-100 bg-red-50/40 hover:bg-red-50'}`}
          >
            <div className="text-xs font-medium text-red-600 uppercase tracking-wide">🔴 Vencidas</div>
            <div className="text-2xl font-bold text-red-700 mt-1">{money(totalOverdue)}</div>
            <div className="text-xs text-red-400 mt-0.5">{countOverdue} comissão(ões) já passaram da data prevista</div>
          </button>
          <button
            type="button"
            onClick={() => { setFilter(''); setDueFilter(dueFilter === 'thisMonth' ? '' : 'thisMonth') }}
            className={`text-left p-4 rounded-lg border transition-colors ${dueFilter === 'thisMonth' ? 'border-amber-400 bg-amber-50' : 'border-amber-100 bg-amber-50/40 hover:bg-amber-50'}`}
          >
            <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">🟡 Vencem Este Mês</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{money(totalDueThisMonth)}</div>
            <div className="text-xs text-amber-500 mt-0.5">{countDueThisMonth} comissão(ões) previstas para {monthYear(thisMonthKey)}</div>
          </button>
        </div>
        {(dueFilter || beneficiaryFilter) && (
          <button
            type="button"
            onClick={() => { setDueFilter(''); setBeneficiaryFilter('') }}
            className="text-xs text-blue-600 hover:underline mt-3"
          >
            Limpar filtros de vencimento/beneficiário
          </button>
        )}
      </div>

      <div className="card p-5 mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Vendido (itens listados abaixo)</div>
          <div className="text-2xl font-bold text-gray-900">{money(totalVendidoLiquido)}</div>
          <div className="text-xs text-gray-400 mt-0.5">bruto: {money(totalVendidoBruto)} · {uniqueSaleItems.size} item(ns) de venda</div>
        </div>
        <span className="text-3xl">🧾</span>
      </div>

      {beneficiarySummary.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resumo por Beneficiário</div>
              <div className="text-xs text-gray-400">Considera todas as comissões, independente do filtro de status abaixo — clique numa linha pra filtrar a tabela por essa pessoa</div>
            </div>
            {beneficiaryFilter && (
              <button type="button" onClick={() => setBeneficiaryFilter('')} className="text-xs text-blue-600 hover:underline">
                Ver todos
              </button>
            )}
          </div>
          <Table headers={['Beneficiário', 'Tipo', 'Vencido', 'Este mês', 'Pago', 'Total (sem canceladas)']}>
            {beneficiarySummary.map(b => (
              <Tr
                key={b.key}
                onClick={() => setBeneficiaryFilter(beneficiaryFilter === b.key ? '' : b.key)}
              >
                <Td className={beneficiaryFilter === b.key ? 'bg-blue-50' : ''}>
                  <div className={`font-medium ${beneficiaryFilter === b.key ? 'text-blue-700' : ''}`}>
                    {beneficiaryFilter === b.key ? '▶ ' : ''}{b.name}
                  </div>
                </Td>
                <Td><span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{b.type}</span></Td>
                <Td>{b.overdue > 0 ? <span className="text-red-600 font-medium">{money(b.overdue)}</span> : <span className="text-gray-300">—</span>}</Td>
                <Td>{b.dueThisMonth > 0 ? <span className="text-amber-600 font-medium">{money(b.dueThisMonth)}</span> : <span className="text-gray-300">—</span>}</Td>
                <Td>{b.paid > 0 ? <span className="text-green-600 font-medium">{money(b.paid)}</span> : <span className="text-gray-300">—</span>}</Td>
                <Td>
                  <div className="font-semibold text-gray-900">{money(b.total)}</div>
                  <div className="text-xs text-gray-400">{b.count} comissão(ões){b.cancelled > 0 ? ` · ${money(b.cancelled)} cancelado` : ''}</div>
                </Td>
              </Tr>
            ))}
          </Table>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          <div className="flex gap-2 flex-wrap">
            {['', 'PREDICTED', 'RELEASED', 'PAID', 'BLOCKED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === '' ? 'Todas' : commissionStatus[s]?.label || s}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setDueFilter(dueFilter === 'overdue' ? '' : 'overdue')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dueFilter === 'overdue' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
              🔴 Vencidas
            </button>
            <button
              onClick={() => setDueFilter(dueFilter === 'thisMonth' ? '' : 'thisMonth')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dueFilter === 'thisMonth' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
              🟡 Este mês
            </button>
          </div>

          <select
            className="input !w-auto text-sm py-1.5"
            value={beneficiaryFilter}
            onChange={e => setBeneficiaryFilter(e.target.value)}
          >
            <option value="">Todos os beneficiários</option>
            {beneficiaryOptions.map(b => (
              <option key={b.key} value={b.key}>{b.name} ({b.type})</option>
            ))}
          </select>

          <div className="flex-1" />

          {filter === '' && (
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={hideCancelled} onChange={() => setHideCancelled(v => !v)} />
              Ocultar canceladas
            </label>
          )}
        </div>
        {selectableCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-50 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={visibleCommissions.filter(isSelectable).every(c => selected.has(c.id))}
              onChange={toggleSelectAll}
            />
            <span>Selecionar todas as elegíveis para pagamento ({selectableCount})</span>
          </div>
        )}
        {visibleCommissions.length === 0 ? (
          <EmptyState
            icon="💰"
            title="Nenhuma comissao encontrada"
            description={
              beneficiaryFilter || dueFilter
                ? 'Nenhuma comissão bate com os filtros de beneficiário/vencimento selecionados. Tente limpar algum deles.'
                : commissions.length > 0
                  ? 'Todas as comissões desta aba estão ocultas (canceladas). Desmarque "Ocultar canceladas" para vê-las.'
                  : 'As comissoes sao calculadas automaticamente quando uma venda e cadastrada.'
            }
          />
        ) : (
          <Table headers={['', 'Beneficiario', 'Produto', 'Cliente', 'Tipo', 'Venda', 'Comissão', 'Previsao', 'Status']}>
            {visibleCommissions.map((c: any) => {
              const st = commissionStatus[c.status] || { label: c.status, color: 'gray' }
              const bene = c.seller?.name || c.partner?.name || c.employee?.name || '—'
              const selectable = isSelectable(c)
              return (
                <Tr key={c.id}>
                  <Td>
                    {selectable && (
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                    )}
                  </Td>
                  <Td><div className="font-medium">{bene}</div></Td>
                  <Td><div className="text-sm text-gray-600">{c.saleItem?.product?.name || '—'}</div></Td>
                  <Td><div className="text-sm text-gray-500">{c.sale?.customer?.companyName || '—'}</div></Td>
                  <Td>
                    <div className="text-xs text-gray-400">{commissionType[c.commissionType] || c.commissionType}</div>
                    {c.rule?.name && <div className="text-xs text-gray-300">{c.rule.name}</div>}
                  </Td>
                  <Td>
                    {c.saleItem ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{money(c.saleItem.netValue)}</div>
                        <div className="text-xs text-gray-400">bruto: {money(c.saleItem.grossValue)}</div>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </Td>
                  <Td><div className="font-semibold text-gray-900">{money(c.amount)}</div></Td>
                  <Td>
                    {c.dateExpectedRelease ? (
                      <div>
                        <div className={`text-xs font-medium ${isOverdue(c) ? 'text-red-600' : 'text-gray-900'}`}>
                          {date(c.dateExpectedRelease)} <span className={isOverdue(c) ? 'text-red-400' : 'text-gray-400'}>({monthYear(c.expectedPaymentCompetence)})</span>
                        </div>
                        <div className="text-xs text-gray-500">{c.forecastReason}</div>
                        {isOverdue(c) && <div className="text-xs text-red-500 font-medium">🔴 Vencida</div>}
                        {!isOverdue(c) && isDueThisMonth(c) && <div className="text-xs text-amber-500 font-medium">🟡 Vence este mês</div>}
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
