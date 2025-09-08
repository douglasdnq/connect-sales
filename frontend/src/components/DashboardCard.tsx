'use client'

import { LucideIcon } from 'lucide-react'

interface DashboardCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}

export default function DashboardCard({ title, value, description, icon: Icon, trend }: DashboardCardProps) {
  return (
    <div className="card">
      <div className="card-content">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-500">{description}</p>
            )}
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        {trend && (
          <div className="flex items-center mt-4 text-sm">
            <span className={`font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-gray-500 ml-2">vs mês anterior</span>
          </div>
        )}
      </div>
    </div>
  )
}