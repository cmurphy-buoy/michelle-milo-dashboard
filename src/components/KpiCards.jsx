import { useMemo } from 'react'

function TrendArrow({ value }) {
  if (value > 0) return <span className="text-green-500 text-sm font-semibold">▲ {value.toFixed(1)}%</span>
  if (value < 0) return <span className="text-red-500 text-sm font-semibold">▼ {Math.abs(value).toFixed(1)}%</span>
  return <span className="text-gray-400 text-sm">— 0%</span>
}

function filterByWeek(arr, weeksAgo = 0) {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 7 * (weeksAgo + 1))
  const end = new Date(now)
  end.setDate(now.getDate() - 7 * weeksAgo)
  return arr.filter((r) => {
    const d = new Date(r.date)
    return d >= start && d < end
  })
}

export default function KpiCards({ data }) {
  const kpis = useMemo(() => {
    const { followers, reels, revenue } = data

    if (!followers.length && !reels.length) {
      return [
        { label: 'Total Combined Followers', value: 'N/A', change: 0, color: 'border-orange-400' },
        { label: 'Avg Views / Reel', value: 'N/A', change: 0, color: 'border-purple-400' },
        { label: 'Engagement Rate', value: 'N/A', change: 0, color: 'border-pink-400' },
        { label: 'Monthly Revenue', value: '$0', change: 0, color: 'border-green-400' },
        { label: 'Growth Rate', value: 'N/A', change: 0, color: 'border-teal-400' },
      ]
    }

    // Combined followers
    const latest = followers[followers.length - 1]
    const weekAgoEntry = [...followers].reverse().find((f) => {
      const d = new Date(f.date)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      return d <= cutoff
    })
    const combined = latest?.combined || 0
    const combinedChange = weekAgoEntry?.combined
      ? ((combined - weekAgoEntry.combined) / weekAgoEntry.combined) * 100
      : 0

    // Avg views per reel — date-based week comparison
    const totalViews = reels.reduce((s, r) => s + r.views, 0)
    const avgViews = reels.length ? Math.round(totalViews / reels.length) : 0
    const thisWeekReels = filterByWeek(reels, 0)
    const lastWeekReels = filterByWeek(reels, 1)
    const recentAvg = thisWeekReels.length ? thisWeekReels.reduce((s, r) => s + r.views, 0) / thisWeekReels.length : 0
    const olderAvg = lastWeekReels.length ? lastWeekReels.reduce((s, r) => s + r.views, 0) / lastWeekReels.length : 0
    const viewsChange = olderAvg ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    // Engagement rate
    const totalEngagement = reels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
    const totalReach = reels.reduce((s, r) => s + r.reach, 0)
    const engRate = totalReach ? (totalEngagement / totalReach) * 100 : 0
    const recentEng = thisWeekReels.length
      ? (thisWeekReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0) /
         Math.max(1, thisWeekReels.reduce((s, r) => s + r.reach, 0))) * 100
      : 0
    const olderEng = lastWeekReels.length
      ? (lastWeekReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0) /
         Math.max(1, lastWeekReels.reduce((s, r) => s + r.reach, 0))) * 100
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
    let growthTrend = 0
    if (followers.length >= 4) {
      const midpoint = followers[Math.floor(followers.length / 2)]
      const firstHalfGrowth = midpoint?.combined && first?.combined
        ? ((midpoint.combined - first.combined) / first.combined) * 100
        : 0
      const secondHalfGrowth = midpoint?.combined
        ? ((combined - midpoint.combined) / midpoint.combined) * 100
        : 0
      growthTrend = secondHalfGrowth - firstHalfGrowth
    }

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
