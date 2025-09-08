'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, Database, AlertTriangle, Users, BarChart3, Webhook } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pedidos', href: '/orders', icon: Database },
  { name: 'Clientes', href: '/customers', icon: Users },
  { name: 'Eventos', href: '/events', icon: Webhook },
  { name: 'Erros', href: '/errors', icon: AlertTriangle },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Configurações', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col w-64 bg-gray-900">
      <div className="flex items-center h-16 px-4 bg-gray-800">
        <h1 className="text-xl font-bold text-white">Racing Lucas</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}