import clsx from 'clsx'
interface Props { label: string; value: string | number; sub?: string; color?: 'blue'|'green'|'yellow'|'red'|'gray'; icon?: string }
export default function StatCard({ label, value, sub, color = 'blue', icon }: Props) {
  const colors = {
    blue: 'bg-brand-50 text-brand-600', green: 'bg-success-50 text-success-600',
    yellow: 'bg-warning-50 text-warning-600', red: 'bg-danger-50 text-danger-600', gray: 'bg-gray-100 text-gray-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && <span className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-sm', colors[color])}>{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
