interface Props { icon?: string; title: string; description?: string; action?: React.ReactNode }
export default function EmptyState({ icon = '📭', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action && action}
    </div>
  )
}
