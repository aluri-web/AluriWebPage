'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ChartDataItem {
  name: string
  value: number
  [key: string]: string | number
}

interface BalancePieChartProps {
  data: ChartDataItem[]
  tooltipMode?: 'currency' | 'rate'
}

const COLORS = ['#2dd4bf', '#10b981', '#06b6d4', '#0ea5e9', '#34d399', '#22d3ee', '#67e8f9', '#6ee7b7']

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, tooltipMode }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload as ChartDataItem
  const label = tooltipMode === 'rate'
    ? `${entry.rate}% E.A.`
    : formatCurrency(entry.value)
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white">
      <p className="text-zinc-400">{entry.name}</p>
      <p className="font-medium">{label}</p>
    </div>
  )
}

export default function BalancePieChart({ data, tooltipMode = 'currency' }: BalancePieChartProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={30}
          outerRadius={50}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip tooltipMode={tooltipMode} />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
