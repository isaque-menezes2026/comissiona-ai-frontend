import clsx from 'clsx'
type Color = 'green'|'yellow'|'red'|'blue'|'gray'|'purple'
interface Props { children: React.ReactNode; color?: Color }
const map: Record<Color, string> = {
  green: 'bg-success-50 text-success-600', yellow: 'bg-warning-50 text-warning-600',
  red: 'bg-danger-50 text-danger-600', blue: 'bg-brand-50 text-brand-600',
  gray: 'bg-gray-100 text-gray-600', purple: 'bg-purple-50 text-purple-600',
}
export default function Badge({ children, color = 'gray' }: Props) {
  return <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', map[color])}>{children}</span>
}
