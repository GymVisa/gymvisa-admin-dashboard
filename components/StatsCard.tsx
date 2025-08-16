import type React from "react"
interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  change?: string
}

export default function StatsCard({ title, value, icon, change }: StatsCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && <p className="text-[#B3FF13] text-sm mt-1">{change}</p>}
        </div>
        <div className="text-[#B3FF13]">{icon}</div>
      </div>
    </div>
  )
}
