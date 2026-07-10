'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Table, { Tr, Td } from '@/components/ui/Table'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { money, date, saleStatus } from '@/lib/formatters'

const EMPTY_FORM = {
  origin: 'direct',
  taxRate: 14,
  saleDate: new Date().toISOString().slice(0, 10),
  items: [] as any[],
  status: 'CONTRACT_SIGNED',
}

const STATUS_OPTIONS = [
  { value: 'CONTRACT_SIGNED', label: 'Contrato assinado' },
  { value: 'IMPLEMENTATION', label: 'Em implantação' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
  { value: 'DEFAULTING', label: 'Inadimplente' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const origins = [
  { value: 'direct', label: 'Venda Direta' },
  { value: 'partner', label: 'Indicação de Parceiro' },
  { value: 'employee', label: 'Indicação de Colaborador' },
  { value: 'upsell', label: 'Upsell' },
  { value: 'crosssell', label: 'Cross-sell' },
  { value: 'inbound', label: 'Lead Inbound' },
  { value: 'outbound', label: 'Lead Outbound' },
  { value: 'campaign', label: 'Campanha' },
  { value: 'referral', label: 'Indicação de Cliente' },
  { value: 'event', label: 'Evento' },
]

export default function VendasPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadingContract, setUploadingContract] = useState(false)
  const [commissionRules, setCommissionRules] = useState<any[]>([])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/sales'),
      api.get('/products'),
      api.get('/people/sellers'),
      api.get('/customers'),
      api.get('/commission-rules'),
      api.get('/people/partners'),
      api.get('/people/employees'),
    ]).then(([s, p, sel, c, cr, pt, emp]) => {
      setSales(s.data)
      setProducts(p.data)
      setSellers(sel.data)
      setCustomers(c.data)
      setCommissionRules(cr.data || [])
      setPartners(pt.data || [])
      setEmployees(emp.data || [])
    }).catch((err: any) => {
      // Sem isso, uma falha de rede/backend deixava a tela de "Nenhuma venda
      // cadastrada" aparecer silenciosamente — parecendo que os dados sumiram.
      alert(err.response?.data?.message || 'Erro ao carregar vendas. Tente atualizar a página.')
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, items: [] })
    setShowModal(true)
  }

  const openEdit = async (sale: any) => {
    // Carrega detalhes completos (com itens)
    const { data } = await api.get(`/sales/${sale.id}`)
    setEditingId(data.id)
    setForm({
      customerId: data.customerId,
      sellerId: data.sellerId,
      partnerId: data.partnerId || '',
      employeeId: data.employeeId || '',
      origin: data.origin,
      taxRate: parseFloat((Number(data.taxRate) * 100).toFixed(2)),
      saleDate: data.saleDate?.slice(0, 10) || '',
      contractDate: data.contractDate?.slice(0, 10) || '',
      billingStartDate: data.billingStartDate?.slice(0, 10) || '',
      contractFileUrl: data.contractFileUrl || '',
      notes: data.notes || '',
      status: data.status,
      items: (data.items || []).map((item: any) => ({
        productId: item.productId,
        type: item.type,
        grossValue: Number(item.grossValue),
        notes: item.notes || '',
      })),
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM, items: [] })
  }

  const handleDelete = async (sale: any) => {
    if (!confirm(`Excluir a venda de "${sale.customer?.companyName || 'cliente'}"? Essa ação não pode ser desfeita.`)) return
    try {
      await api.delete(`/sales/${sale.id}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Não foi possível excluir esta venda.')
    }
  }

  // Mapeia commissionType da regra para o tipo de item da venda
  const getDefaultItemType = (productId: string): string => {
    const rule = commissionRules.find((r: any) => r.productId === productId && r.active !== false)
    if (!rule) return 'MONTHLY'
    const ct = rule.commissionType as string
    if (ct === 'percentage_eventual_value' || ct === 'percentage_implantation') return 'IMPLANTATION'
    if (ct === 'fixed_amount') return 'ONE_TIME'
    if (ct === 'recurring') return 'MONTHLY'
    // third_monthly_payment, first_monthly_payment, percentage_monthly_value → MONTHLY
    return 'MONTHLY'
  }

  const addItem = () =>
    setForm((f: any) => ({ ...f, items: [...f.items, { productId: '', type: 'MONTHLY', grossValue: 0 }] }))

  const removeItem = (i: number) =>
    setForm((f: any) => ({ ...f, items: f.items.filter((_: any, idx: number) => idx !== i) }))

  const updateItem = (i: number, field: string, val: any) =>
    setForm((f: any) => ({
      ...f,
      items: f.items.map((item: any, idx: number) => idx === i ? { ...item, [field]: val } : item),
    }))

  // Ao selecionar produto: preenche o tipo automaticamente
  const selectItemProduct = (i: number, productId: string) => {
    const suggestedType = getDefaultItemType(productId)
    setForm((f: any) => ({
      ...f,
      items: f.items.map((item: any, idx: number) =>
        idx === i ? { ...item, productId, type: suggestedType } : item
      ),
    }))
  }

  // Ao trocar a origem: limpa parceiro/colaborador se não fizer mais sentido
  const selectOrigin = (origin: string) => {
    setForm((f: any) => ({
      ...f,
      origin,
      partnerId: origin === 'partner' ? f.partnerId : '',
      employeeId: origin === 'employee' ? f.employeeId : '',
    }))
  }

  // Anexo avulso de contrato assinado — pra vendas fechadas fora do portal Kualiz,
  // sem a integração automática. Só disponível editando uma venda já salva (precisa
  // do id). Sobe pro Supabase Storage do próprio Comissiona e já preenche o link.
  const uploadContractFile = async (file: File | undefined) => {
    if (!file || !editingId) return
    if (file.type !== 'application/pdf') {
      alert('Envie um arquivo PDF.')
      return
    }
    setUploadingContract(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const { data } = await api.post(`/sales/${editingId}/contract-file`, body, {
        headers: { 'Content-Type': undefined },
      })
      setForm((f: any) => ({ ...f, contractFileUrl: data.contractFileUrl }))
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao enviar arquivo.')
    } finally {
      setUploadingContract(false)
    }
  }

  // Remove o link do contrato anexado (não apaga o arquivo do storage, só desvincula
  // da venda). Aplica na hora, sem precisar clicar em "Salvar alterações".
  const removeContractFile = async () => {
    if (!editingId) return
    if (!confirm('Remover o contrato anexado desta venda?')) return
    try {
      await api.patch(`/sales/${editingId}`, { contractFileUrl: '' })
      setForm((f: any) => ({ ...f, contractFileUrl: '' }))
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao remover o arquivo.')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.items.length === 0) {
      alert('Adicione pelo menos um produto antes de salvar a venda.')
      return
    }

    if (form.origin === 'partner' && !form.partnerId) {
      alert('Selecione o parceiro responsável pela indicação.')
      return
    }

    if (form.origin === 'employee' && !form.employeeId) {
      alert('Selecione o colaborador responsável pela indicação.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await api.patch(`/sales/${editingId}`, form)
      } else {
        await api.post('/sales', form)
      }
      closeModal()
      load()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  // Todos os produtos + módulos para o select
  const allProducts = [
    ...products,
    ...products.flatMap((p: any) => (p.modules || []).map((m: any) => ({ ...m, _parent: p.name }))),
  ]

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Lançamento e controle de vendas realizadas"
        action={<button onClick={openNew} className="btn-primary">+ Nova Venda</button>}
      />

      <div className="card overflow-hidden">
        {sales.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Nenhuma venda cadastrada"
            description="Clique em Nova Venda para lançar a primeira venda."
            action={<button onClick={openNew} className="btn-primary">Nova Venda</button>}
          />
        ) : (
          <Table headers={['Cliente', 'Vendedor', 'Origem', 'Data', 'Status', 'Itens', '']}>
            {sales.map(s => {
              const st = saleStatus[s.status] || { label: s.status, color: 'gray' }
              return (
                <Tr key={s.id}>
                  <Td>
                    <div className="font-medium">{s.customer?.companyName || '—'}</div>
                    {s.contractFileUrl && (
                      <a
                        href={s.contractFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        📄 Ver contrato
                      </a>
                    )}
                  </Td>
                  <Td><div className="text-gray-600">{s.seller?.name || '—'}</div></Td>
                  <Td><div className="text-xs text-gray-500">{origins.find(o => o.value === s.origin)?.label || s.origin}</div></Td>
                  <Td>{date(s.saleDate)}</Td>
                  <Td><Badge color={st.color as any}>{st.label}</Badge></Td>
                  <Td>
                    <span className={`text-xs ${(s.items?.length || 0) === 0 ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                      {s.items?.length || 0} item(s)
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-1"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="text-xs text-red-400 hover:text-red-600 hover:underline px-2 py-1"
                      >
                        Excluir
                      </button>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingId ? 'Editar Venda' : 'Nova Venda'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <select
                className="input"
                value={form.customerId || ''}
                onChange={e => setForm((f: any) => ({ ...f, customerId: e.target.value }))}
                required
              >
                <option value="">Selecione...</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Vendedor *</label>
              <select
                className="input"
                value={form.sellerId || ''}
                onChange={e => setForm((f: any) => ({ ...f, sellerId: e.target.value }))}
                required
              >
                <option value="">Selecione...</option>
                {sellers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Origem *</label>
              <select
                className="input"
                value={form.origin}
                onChange={e => selectOrigin(e.target.value)}
              >
                {origins.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {form.origin === 'partner' && (
              <div>
                <label className="label">Parceiro *</label>
                <select
                  className="input"
                  value={form.partnerId || ''}
                  onChange={e => setForm((f: any) => ({ ...f, partnerId: e.target.value }))}
                  required
                >
                  <option value="">Selecione...</option>
                  {partners.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {partners.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Nenhum parceiro cadastrado — cadastre em Pessoas.</p>
                )}
              </div>
            )}

            {form.origin === 'employee' && (
              <div>
                <label className="label">Colaborador Indicador *</label>
                <select
                  className="input"
                  value={form.employeeId || ''}
                  onChange={e => setForm((f: any) => ({ ...f, employeeId: e.target.value }))}
                  required
                >
                  <option value="">Selecione...</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                {employees.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Nenhum colaborador cadastrado — cadastre em Pessoas.</p>
                )}
              </div>
            )}

            <div>
              <label className="label">Data da Venda *</label>
              <input
                type="date"
                className="input"
                value={form.saleDate}
                onChange={e => setForm((f: any) => ({ ...f, saleDate: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Data do Contrato</label>
              <input
                type="date"
                className="input"
                value={form.contractDate || ''}
                onChange={e => setForm((f: any) => ({ ...f, contractDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Início do Faturamento</label>
              <input
                type="date"
                className="input"
                value={form.billingStartDate || ''}
                onChange={e => setForm((f: any) => ({ ...f, billingStartDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Link do Contrato</label>
              <input
                type="url"
                className="input"
                value={form.contractFileUrl || ''}
                onChange={e => setForm((f: any) => ({ ...f, contractFileUrl: e.target.value }))}
                placeholder="https://... (preenchido automaticamente pelo portal Kualiz)"
              />
              {editingId ? (
                <div className="mt-1.5 flex items-center gap-3">
                  <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                    {uploadingContract
                      ? 'Enviando...'
                      : form.contractFileUrl ? '📎 Substituir PDF' : '📎 Anexar PDF do contrato'}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={uploadingContract}
                      onChange={e => uploadContractFile(e.target.files?.[0])}
                    />
                  </label>
                  {form.contractFileUrl && (
                    <button type="button" onClick={removeContractFile} className="text-xs text-red-500 hover:underline">
                      🗑 Remover
                    </button>
                  )}
                  {form.contractFileUrl && (
                    <a href={form.contractFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:underline">
                      Ver arquivo
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Salve a venda primeiro para poder anexar o PDF direto aqui.</p>
              )}
            </div>

            <div>
              <label className="label">Impostos (%)</label>
              <input
                type="number"
                className="input"
                value={form.taxRate}
                min={0}
                max={100}
                step={0.01}
                onChange={e => setForm((f: any) => ({ ...f, taxRate: parseFloat(e.target.value) }))}
              />
            </div>

            {editingId && (
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={form.status || 'CONTRACT_SIGNED'}
                  onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes || ''}
              onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
              placeholder="Informações adicionais sobre a venda..."
            />
          </div>

          {/* Itens da venda */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">
                Itens da Venda{' '}
                <span className="text-red-500">*</span>
                {form.items.length === 0 && (
                  <span className="ml-2 text-xs text-red-500 font-normal">— obrigatório ao menos 1 item</span>
                )}
              </label>
              <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">
                + Adicionar item
              </button>
            </div>

            {form.items.length === 0 && (
              <div className="text-sm text-gray-400 py-3 px-4 border border-dashed border-red-200 rounded-lg bg-red-50 text-center">
                Nenhum produto adicionado. Clique em "+ Adicionar item" para incluir produtos.
              </div>
            )}

            {form.items.map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                <select
                  className="input"
                  value={item.productId}
                  onChange={e => selectItemProduct(i, e.target.value)}
                  required
                >
                  <option value="">Produto...</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  {products.flatMap((p: any) =>
                    (p.modules || []).map((m: any) => (
                      <option key={m.id} value={m.id}>↳ {m.name}</option>
                    ))
                  )}
                </select>

                <select
                  className="input"
                  value={item.type}
                  onChange={e => updateItem(i, 'type', e.target.value)}
                >
                  <option value="MONTHLY">Mensalidade</option>
                  <option value="IMPLANTATION">Implantação</option>
                  <option value="ONE_TIME">Avulso</option>
                  <option value="ANNUAL">Anual</option>
                </select>

                <div className="flex gap-1">
                  <input
                    type="number"
                    className="input"
                    placeholder="Valor bruto (R$)"
                    value={item.grossValue || ''}
                    min={0}
                    step={0.01}
                    onChange={e => updateItem(i, 'grossValue', parseFloat(e.target.value))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-red-400 hover:text-red-600 px-2 text-lg"
                    title="Remover item"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            {/* Resumo de valor */}
            {form.items.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-right">
                <span className="text-gray-600">Total bruto: </span>
                <span className="font-semibold">
                  {money(form.items.reduce((acc: number, item: any) => acc + (Number(item.grossValue) || 0), 0))}
                </span>
                <span className="mx-2 text-gray-400">|</span>
                <span className="text-gray-600">Total líquido ({form.taxRate}% imposto): </span>
                <span className="font-semibold text-green-700">
                  {money(form.items.reduce((acc: number, item: any) => {
                    const gross = Number(item.grossValue) || 0
                    return acc + gross * (1 - (form.taxRate || 0) / 100)
                  }, 0))}
                </span>
              </div>
            )}
          </div>

          {editingId && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ Ao salvar, comissões previstas serão recalculadas com base nos novos itens.
              Comissões já liberadas ou pagas não serão afetadas.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar Venda'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
