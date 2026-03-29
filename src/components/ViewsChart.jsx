import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const PLATFORM_COLORS = { instagram: '#C13584', tiktok: '#00C9B1', facebook: '#1877F2' }

export default function ViewsChart({ reels }) {
  const { chartData, avgViews } = useMemo(() => {
    const sorted = [...reels].sort((a, b) => a.date.localeCompare(b.date))
    const avg = sorted.length ? Math.round(sorted.reduce((s, r) => s + r.views, 0) / sorted.length) : 0
    return {
      chartData: sorted.map((r, i) => ({
        name: r.title?.slice(0, 15) || `Reel ${i + 1}`,
        views: r.views,
        fill: PLATFORM_COLORS[r.platform] || '#999',
      })),
      avgViews: avg,
    }
  }, [reels])

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Views Per Reel</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <ReferenceLine y={avgViews} stroke="#F97316" strokeDasharray="4 4" label={{ value: `Avg: ${(avgViews / 1000).toFixed(0)}K`, position: 'right', fontSize: 11 }} />
          <Bar dataKey="views" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <rect key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
