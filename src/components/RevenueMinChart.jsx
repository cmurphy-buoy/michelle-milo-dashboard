import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#FBBF24', '#F97316', '#F97316', '#EF4444']

export default function RevenueMinChart({ revenue }) {
  const chartData = useMemo(() =>
    revenue.map((m) => ({
      month: (m.month || '').slice(2), // YY-MM
      total: m.total || 0,
    })),
    [revenue]
  )

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue</h3>
        <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No revenue data available</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => '$' + (v / 1000).toFixed(1) + 'K'} />
          <Tooltip formatter={(v) => '$' + v.toLocaleString()} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
