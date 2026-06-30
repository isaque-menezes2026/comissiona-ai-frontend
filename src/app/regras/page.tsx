'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Table, { Tr, Td } from '@/components/ui/Table'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import { commissionType } from '@/lib/formatters'

const triggerLabels: Record<string, string> = {
  CONTRACT_SIGNED: 'Contrato assinado',
  INVOICE_ISSUED: 'Fatura emitida',
  INVOICE_PAID: 'Fatura paga',
  FIRST_INVOICE_PAID: '1a fatura paga',
  THIRD_INVOICE_PAID: '3a fatura paga',
  MANUAL_APPROVAL: 'Aprovacao manual',
}

const beneficiaryLabels: Record<string, string> = {
  SELLER: 'Vendedor', PARTNER: 'Parceiro', EMPLOYEE: 'Colaborador',
}

export default function RegrasPage() {
  const [rules, setRules] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ beneficiaryType: 'SELLER', commissionType: 'THIRD_MONTHLY_PAYMENT', triggerEvent: 'THIRD_INVOICE_PAID', appliesOnNetAmount: true, active: true })

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/commission-rules'), api.get('/products')])
      .then(([r, p]) => { setRules(r.data); setProducts(p.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/commission-rules', form); setShowModal(false); load() }
    catch (err: any) { alert(err.response?.data?.message || 'Erro') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader title="Regras de Comissao" description="Configure as regras de calculo para cada produto e canal" action={<button onClick={() => setShowModal(true)} className="btn-primary">+ Nova Regra</button>} />

      <div className="card overflow-hidden">
        <Table headers={['Nome', 'Produto', 'Beneficiario', 'Tipo', 'Valor', 'Gatilho', 'Status']}>
          {rules.map(r => (
            <Tr key={r.id}>
              <Td><div className="font-medium">{r.name}</div>{r.description && <div className="text-xs text-gray-400">{r.description}</div>}</Td>
              <Td><div className="text-sm text-gray-600">{r.product?.name || 'Todos'}</div></Td>
              <Td><Badge color="blue">{beneficiaryLabels[r.beneficiaryType] || r.beneficiaryType}</Badge></Td>
              <Td><div className="text-xs text-gray-500">{commissionType[r.commissionType] || r.commissionType}</div></Td>
              <Td>
                {r.fixedAmount ? <span className="font-semibold">R$ {Number(r.fixedAmount).toFixed(2)}</span> : null}
                {r.percentage ? <span className="font-semibold">{Number(r.percentage).toFixed(1)}%</span> : null}
              </Td>
              <Td><div className="text-xs text-gray-500">{triggerLabels[r.triggerEvent] || r.triggerEvent}</div></Td>
              <Td><Badge color={r.active ? 'green' : 'gray'}>{r.active ? 'Ativa' : 'Inativa'}</Badge></Td>
            </Tr>
          ))}
        </Table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Regra de Comissao" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Nome da Regra *</label>
            <input className="input" value={form.name || ''} onChange={e => setForm((f: any) => ({...f, name: e.target.value}))} placeholder="Ex: Kualiz - 3a Mensalidade" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Produto (opcional)</label>
              <select className="input" value={form.productId || ''} onChange={e => setForm((f: any) => ({...f, productId: e.target.value || null}))}>
                <option value="">Todos os produtos</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                {products.flatMap((p: any) => p.modules || []).map((m: any) => <option key={m.id} value={m.id}>  {m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Beneficiario *</label>
              <select className="input" value={form.beneficiaryType} onChange={e => setForm((f: any) => ({...f, beneficiaryType: e.target.value}))}>
                <option value="SELLER">Vendedor</option>
                <option value="PARTNER">Parceiro</option>
                <option value="EMPLOYEE">Colaborador</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de Comissao *</label>
              <select className="input" value={form.commissionType} onChange={e => setForm((f: any) => ({...f, commissionType: e.target.value}))}>
                {Object.entries(commissionType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Gatilho *</label>
              <select className="input" value={form.triggerEvent} onChange={e => setForm((f: any) => ({...f, triggerEvent: e.target.value}))}>
                {Object.entries(triggerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.commissionType !== 'FIXED_AMOUNT' && (
              <div>
                <label className="label">Percentual (%)</label>
                <input type="number" className="input" min={0} max={100} step={0.01} value={form.percentage || ''} onChange={e => setForm((f: any) => ({...f, percentage: e.target.value}))} />
              </div>
            )}
            {form.commissionType === 'FIXED_AMOUNT' && (
              <div>
                <label className="label">Valor Fixo (R$)</label>
                <input type="number" className="input" min={0} step={0.01} value={form.fixedAmount || ''} onChange={e => setForm((f: any) => ({...f, fixedAmount: e.target.value}))} />
              </div>
            )}
            <div>
              <label className="label">Prazo previsto (dias)</label>
              <input type="number" className="input" min={0} value={form.appliesAfterDays || ''} onChange={e => setForm((f: any) => ({...f, appliesAfterDays: parseInt(e.target.value)}))} placeholder="Ex: 90" />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.appliesOnNetAmount} onChange={e => setForm((f: any) => ({...f, appliesOnNetAmount: e.target.checked}))} />Calcular sobre valor liquido</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresCustomerActive} onChange={e => setForm((f: any) => ({...f, requiresCustomerActive: e.target.checked}))} />Requer cliente ativo</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm((f: any) => ({...f, active: e.target.checked}))} />Ativa</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Criar Regra'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
