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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Por padrão, oculta as canceladas na aba "Todas" (ainda podem ser vistas
  // na aba "Cancelada"). Excluídas nunca aparecem, pois saem do banco.
  const [hideCancelled, setHideCancelled] = useState(true)

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

  // Exclusão definitiva (chama o DELETE do backend, que já bloqueia comissão
  // paga ou vinculada a lote de pagamento). Cancelada e prevista podem ser excluídas.
  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta comissão definitivamente? Essa ação não pode ser desfeita.')) return
    setDeletingId(id)
    try {
      const { data } = await api.delete(`/commissions/${id}`)
      alert(data.message || 'Comissão excluída com sucesso.')
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao excluir comissão.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <LoadingSpinner />

  // Na aba "Todas", com o toggle ligado, some com as canceladas da lista
  // (elas continuam existindo e acessíveis pela aba "Cancelada").
  const visibleCommissions = filter === '' && hideCancelled
    ? commissions.filter((c: any) => c.status !== 'CANCELLED')
    : commissions

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
  const beneficiaryMap = new Map<string, { name: string; type: string; predicted: number; blocked: number; released: number; paid: number; cancelled: number; total: number; count: number }>()
  allCommissions.forEach((c: any) => {
    const bene = c.seller || c.partner || c.employee
    if (!bene) return
    const type = c.seller ? 'Vendedor' : c.partner ? 'Parceiro' : 'Colaborador'
    const key = `${type}-${bene.id}`
    if (!beneficiaryMap.has(key)) {
      beneficiaryMap.set(key, { name: bene.name, type, predicted: 0, blocked: 0, released: 0, paid: 0, cancelled: 0, total: 0, count: 0 })
    }
    const entry = beneficiaryMap.get(key)!
    const amount = Number(c.amount || 0)
    if (c.status === 'PREDICTED') entry.predicted += amount
    else if (c.status === 'BLOCKED') entry.blocked += amount
    else if (c.status === 'RELEASED') entry.released += amount
    else if (c.status === 'PAID') entry.paid += amount
    else if (c.status === 'CANCELLED') entry.cancelled += amount
    if (c.status !== 'CANCELLED') { entry.total += amount; entry.count += 1 }
  })
  const beneficiarySummary = [...beneficiaryMap.values()].sort((a, b) => b.total - a.total)

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
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resumo por Beneficiário</div>
            <div className="text-xs text-gray-400">Considera todas as comissões, independente do filtro de status abaixo</div>
          </div>
          <Table headers={['Beneficiário', 'Tipo', 'Previsto', 'Bloqueado', 'Liberado', 'Pago', 'Total (sem canceladas)']}>
            {beneficiarySummary.map(b => (
              <Tr key={`${b.type}-${b.name}`}>
                <Td><div className="font-medium">{b.name}</div></Td>
                <Td><span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{b.type}</span></Td>
                <Td>{b.predicted > 0 ? money(b.predicted) : <span className="text-gray-300">—</span>}</Td>
                <Td>{b.blocked > 0 ? money(b.blocked) : <span className="text-gray-300">—</span>}</Td>
                <Td>{b.released > 0 ? money(b.released) : <span className="text-gray-300">—</span>}</Td>
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
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex gap-2">
            {['', 'PREDICTED', 'RELEASED', 'PAID', 'BLOCKED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === '' ? 'Todas' : commissionStatus[s]?.label || s}
              </button>
            ))}
          </div>
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
          <EmptyState icon="💰" title="Nenhuma comissao encontrada" description={commissions.length > 0 ? 'Todas as comissões desta aba estão ocultas (canceladas). Desmarque "Ocultar canceladas" para vê-las.' : 'As comissoes sao calculadas automaticamente quando uma venda e cadastrada.'} />
        ) : (
          <Table headers={['', 'Beneficiario', 'Produto', 'Cliente', 'Tipo', 'Venda', 'Comissão', 'Previsao', 'Status', 'Ações']}>
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
                        <div className="text-xs font-medium text-gray-900">{date(c.dateExpectedRelease)} <span className="text-gray-400">({monthYear(c.expectedPaymentCompetence)})</span></div>
                        <div className="text-xs text-gray-500">{c.forecastReason}</div>
                        {c.forecastStatus && <div className="text-xs text-blue-500">{forecastStatusLabel[c.forecastStatus] || c.forecastStatus}</div>}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </Td>
                  <Td><Badge color={st.color as any}>{st.label}</Badge></Td>
                  <Td>
                    {c.status !== 'PAID' && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      >
                        {deletingId === c.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </div>
    </div>
  )
}
