'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', icon: '▦', label: 'Dashboard' },
  { href: '/vendas', icon: '🛒', label: 'Vendas' },
  { href: '/comissoes', icon: '💰', label: 'Comissões' },
  { href: '/pagamentos', icon: '💳', label: 'Pagamentos' },
  { href: '/clientes', icon: '🏢', label: 'Clientes' },
  { href: '/pessoas', icon: '👥', label: 'Pessoas' },
  { href: '/produtos', icon: '📦', label: 'Produtos' },
  { href: '/regras', icon: '⚙️', label: 'Regras' },
  { href: '/metas', icon: '🎯', label: 'Metas' },
  { href: '/relatorios', icon: '📊', label: 'Relatórios' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-900 text-white flex flex-col z-30">
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-sm font-bold">C</div>
          <div>
            <div className="text-sm font-semibold leading-none">Comissiona</div>
            <div className="text-xs text-gray-400 mt-0.5">AI</div>
          </div>
        </div>
        {user && <div className="mt-3 text-xs text-gray-400 truncate">{user.tenant?.name}</div>}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active ? 'bg-brand-500 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        {user && (
          <div className="px-3 py-2 mb-2">
            <div className="text-xs font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
            <div className="text-xs text-gray-500 mt-0.5">{user.role}</div>
          </div>
        )}
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
          <span>🚪</span><span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
