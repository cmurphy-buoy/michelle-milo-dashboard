import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#F97316', '#60A5FA']

export default function ReachPieChart({ reels }) {
  const pieData = useMemo(() => {
    const totalReach = reels.reduce((s, r) => s + r.reach, 0)
    const nonFollowerReach = reels.reduce((s, r) => s + Math.round(r.reach * (r.nonFollowerReachPct / 100)), 0)
    const followerReach = totalReach - nonFollowerReach
    return [
      { name: 'Followers', value: followerReach },
      { name: 'Non-Followers', value: nonFollowerReach },
    ]
  }, [reels])

  const total = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Reach Source</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name}: ${total ? ((value / total) * 100).toFixed(0) : 0}%`}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => v.toLocaleString()} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
