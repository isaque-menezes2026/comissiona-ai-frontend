import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
dayjs.locale('pt-br')

export const money = (v: number | string | null | undefined) => {
  const n = Number(v || 0)
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export const pct = (v: number | string | null | undefined) => `${Number(v || 0).toFixed(1)}%`

export const date = (v: string | Date | null | undefined) => v ? dayjs(v).format('DD/MM/YYYY') : '—'

export const monthYear = (v: string | null | undefined) => {
  if (!v) return '—'
  const [y, m] = v.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[parseInt(m) - 1]}/${y}`
}

export const commissionStatus: Record<string, { label: string; color: 'green'|'yellow'|'red'|'blue'|'gray' }> = {
  PREDICTED: { label: 'Prevista', color: 'blue' },
  BLOCKED: { label: 'Bloqueada', color: 'yellow' },
  RELEASED: { label: 'Liberada', color: 'green' },
  PAID: { label: 'Paga', color: 'gray' },
  CANCELLED: { label: 'Cancelada', color: 'red' },
  REVERSED: { label: 'Estornada', color: 'red' },
}

export const saleStatus: Record<string, { label: string; color: 'green'|'yellow'|'red'|'blue'|'gray' }> = {
  PROPOSAL: { label: 'Proposta', color: 'gray' },
  CLOSED: { label: 'Fechada', color: 'blue' },
  CONTRACT_SIGNED: { label: 'Contrato assinado', color: 'blue' },
  IN_IMPLEMENTATION: { label: 'Em implantação', color: 'yellow' },
  ACTIVE: { label: 'Ativa', color: 'green' },
  CANCELLED: { label: 'Cancelada', color: 'red' },
  DEFAULTING: { label: 'Inadimplente', color: 'red' },
  SUSPENDED: { label: 'Suspensa', color: 'yellow' },
}

export const commissionType: Record<string, string> = {
  PERCENTAGE_IMPLANTATION: '% Implantação',
  PERCENTAGE_MONTHLY: '% Mensalidade',
  FIXED_AMOUNT: 'Valor fixo',
  FIRST_MONTHLY_PAYMENT: '1ª Mensalidade',
  THIRD_MONTHLY_PAYMENT: '3ª Mensalidade',
  RECURRING: 'Recorrente',
  BONUS: 'Bônus',
}

export const forecastStatusLabel: Record<string, string> = {
  awaiting_billing: 'Aguardando faturamento',
  awaiting_third_payment: 'Aguardando pagamento da 3ª mensalidade',
  awaiting_first_payment: 'Aguardando pagamento da 1ª mensalidade',
  awaiting_implantation_payment: 'Aguardando pagamento da implantação',
  awaiting_contract: 'Aguardando conversão do contrato',
  released: 'Liberada',
  cancelled: 'Cancelada',
}
