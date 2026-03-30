import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function EngagementChart({ reels }) {
  const weeklyData = useMemo(() => {
    const weeks = {}
    reels.forEach((r) => {
      const d = new Date(r.date)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      if (!weeks[key]) weeks[key] = { week: key, Shares: 0, Saves: 0, Comments: 0, Likes: 0 }
      weeks[key].Shares += r.shares
      weeks[key].Saves += r.saves
      weeks[key].Comments += r.comments
      weeks[key].Likes += r.likes
    })
    return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
  }, [reels])

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Engagement Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(1) + 'K'} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Shares" stackId="a" fill="#F97316" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Saves" stackId="a" fill="#FBBF24" />
          <Bar dataKey="Comments" stackId="a" fill="#60A5FA" />
          <Bar dataKey="Likes" stackId="a" fill="#F472B6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
