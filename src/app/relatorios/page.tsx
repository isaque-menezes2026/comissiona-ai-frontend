'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Badge from '@/components/ui/Badge'
import { money, date, commissionStatus } from '@/lib/formatters'

export default function RelatoriosPage() {
  const [tab, setTab] = useState<'period'|'by-seller'|'by-product'|'pending'>('period')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10) })
  const [to, setTo] = useState(new Date().toISOString().slice(0,10))

  const load = async () => {
    setLoading(true)
    try {
      let r
      if (tab === 'period') r = await api.get(`/reports/by-period?from=${from}&to=${to}`)
      else if (tab === 'by-seller') r = await api.get(`/reports/by-seller?from=${from}&to=${to}`)
      else if (tab === 'by-product') r = await api.get(`/reports/by-product?from=${from}&to=${to}`)
      else r = await api.get('/reports/pending-payments')
      setData(r?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab])

  const tabs = [
    { key: 'period', label: 'Por Periodo' },
    { key: 'by-seller', label: 'Por Vendedor' },
    { key: 'by-product', label: 'Por Produto' },
    { key: 'pending', label: 'Pendentes de Pagamento' },
  ]

  return (
    <div>
      <PageHeader title="Relatorios" description="Analise de comissoes por diferentes dimensoes" />

      <div className="flex gap-1 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'pending' && (
        <div className="card p-4 mb-6 flex items-end gap-4">
          <div>
            <label className="label">De</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Ate</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button onClick={load} className="btn-primary py-2">Filtrar</button>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          {data.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Nenhum dado encontrado para o filtro selecionado.</div>
          ) : (
            <>
              {tab === 'period' && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    {['Beneficiario','Produto','Cliente','Tipo','Valor','Status','Previsao'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.map((c: any) => {
                      const st = commissionStatus[c.status] || { label: c.status, color: 'gray' }
                      return (
                        <tr key={c.id} className="border-b border-gray-50">
                          <td className="px-4 py-3">{c.seller?.name || c.partner?.name || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{c.saleItem?.product?.name || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{c.sale?.customer?.companyName || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{c.commissionType}</td>
                          <td className="px-4 py-3 font-semibold">{money(c.amount)}</td>
                          <td className="px-4 py-3"><Badge color={st.color as any}>{st.label}</Badge></td>
                          <td className="px-4 py-3 text-xs text-gray-400">{c.expectedPaymentCompetence || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {tab === 'by-seller' && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    {['Vendedor','Total Comissoes','Qtd'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium">{r.sellerId || 'N/A'}</td>
                        <td className="px-4 py-3 font-semibold">{money(r._sum?.amount)}</td>
                        <td className="px-4 py-3 text-gray-500">{r._count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === 'by-product' && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    {['Produto','Total','Qtd'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium">{r.productName}</td>
                        <td className="px-4 py-3 font-semibold">{money(r.total)}</td>
                        <td className="px-4 py-3 text-gray-500">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === 'pending' && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    {['Beneficiario','Produto','Valor','Liberado em'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.map((c: any) => (
                      <tr key={c.id} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-medium">{c.seller?.name || c.partner?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{c.saleItem?.product?.name || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">{money(c.amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{date(c.releasedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
