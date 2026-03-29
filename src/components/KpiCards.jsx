import { useMemo } from 'react'
import { getData, KEYS } from '../utils/storage'

function TrendArrow({ value }) {
  if (value > 0) return <span className="text-green-500 text-sm font-semibold">▲ {value.toFixed(1)}%</span>
  if (value < 0) return <span className="text-red-500 text-sm font-semibold">▼ {Math.abs(value).toFixed(1)}%</span>
  return <span className="text-gray-400 text-sm">— 0%</span>
}

export default function KpiCards({ data }) {
  const kpis = useMemo(() => {
    const { followers, reels, revenue } = data

    // Combined followers
    const latest = followers[followers.length - 1]
    const weekAgo = followers[Math.max(0, followers.length - 8)]
    const combined = latest?.combined || 0
    const combinedChange = weekAgo?.combined
      ? ((combined - weekAgo.combined) / weekAgo.combined) * 100
      : 0

    // Avg views per reel
    const totalViews = reels.reduce((s, r) => s + r.views, 0)
    const avgViews = reels.length ? Math.round(totalViews / reels.length) : 0
    const recentReels = reels.slice(-7)
    const olderReels = reels.slice(-14, -7)
    const recentAvg = recentReels.length ? recentReels.reduce((s, r) => s + r.views, 0) / recentReels.length : 0
    const olderAvg = olderReels.length ? olderReels.reduce((s, r) => s + r.views, 0) / olderReels.length : 0
    const viewsChange = olderAvg ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    // Engagement rate
    const totalEngagement = reels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
    const totalReach = reels.reduce((s, r) => s + r.reach, 0)
    const engRate = totalReach ? (totalEngagement / totalReach) * 100 : 0
    const recentEng = recentReels.length
      ? (recentReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0) /
         Math.max(1, recentReels.reduce((s, r) => s + r.reach, 0))) * 100
      : 0
    const olderEng = olderReels.length
      ? (olderReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0) /
         Math.max(1, olderReels.reduce((s, r) => s + r.reach, 0))) * 100
      : 0
    const engChange = olderEng ? ((recentEng - olderEng) / olderEng) * 100 : 0

    // Monthly revenue
    const currentMonth = revenue[revenue.length - 1]
    const prevMonth = revenue[revenue.length - 2]
    const monthlyRev = currentMonth?.total || 0
    const revChange = prevMonth?.total ? ((monthlyRev - prevMonth.total) / prevMonth.total) * 100 : 0

    // Growth rate (follower % change over the period)
    const first = followers[0]
    const growthRate = first?.combined ? ((combined - first.combined) / first.combined) * 100 : 0
    const midpoint = followers[Math.floor(followers.length / 2)]
    const firstHalfGrowth = midpoint?.combined && first?.combined
      ? ((midpoint.combined - first.combined) / first.combined) * 100
      : 0
    const secondHalfGrowth = midpoint?.combined
      ? ((combined - midpoint.combined) / midpoint.combined) * 100
      : 0
    const growthTrend = secondHalfGrowth - firstHalfGrowth

    return [
      { label: 'Total Combined Followers', value: combined.toLocaleString(), change: combinedChange, color: 'border-orange-400' },
      { label: 'Avg Views / Reel', value: avgViews.toLocaleString(), change: viewsChange, color: 'border-purple-400' },
      { label: 'Engagement Rate', value: engRate.toFixed(2) + '%', change: engChange, color: 'border-pink-400' },
      { label: 'Monthly Revenue', value: '$' + monthlyRev.toLocaleString(), change: revChange, color: 'border-green-400' },
      { label: 'Growth Rate', value: growthRate.toFixed(2) + '%', change: growthTrend, color: 'border-teal-400' },
    ]
  }, [data])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${kpi.color}`}>
          <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
          <TrendArrow value={kpi.change} />
        </div>
      ))}
    </div>
  )
}
