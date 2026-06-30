export default function LoadingSpinner({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  )
}
