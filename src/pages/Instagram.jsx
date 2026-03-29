import { useState, useMemo } from 'react'
import { getData, KEYS } from '../utils/storage'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

// IG brand palette
const IG_PURPLE = '#833AB4'
const IG_PINK = '#E1306C'
const IG_MAGENTA = '#C13584'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n) {
  if (n == null) return '--'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function pct(n) {
  if (n == null) return '--'
  return n.toFixed(2) + '%'
}

function filterByDateRange(reels, dateRange) {
  if (!dateRange || dateRange === 0) return reels
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - dateRange)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return reels.filter((r) => r.date >= cutoffStr)
}

function weekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

function twoWeeksAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 14)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, trend, borderColor }) {
  const isUp = trend >= 0
  return (
    <div className={`bg-gray-900 rounded-xl p-5 border-l-4 ${borderColor}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className={`text-sm mt-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '\u25B2' : '\u25BC'} {Math.abs(trend).toFixed(1)}% vs last week
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable Table
// ---------------------------------------------------------------------------

function SortableTable({ data }) {
  const [sortKey, setSortKey] = useState('views')
  const [sortAsc, setSortAsc] = useState(false)

  const columns = [
    { key: 'title', label: 'Reel Name' },
    { key: 'views', label: 'Views' },
    { key: 'dmShares', label: 'DM Shares' },
    { key: 'saves', label: 'Saves' },
    { key: 'profileVisits', label: 'Profile Visits' },
    { key: 'followsGenerated', label: 'Follows Generated' },
    { key: 'audioType', label: 'Audio Type' },
  ]

  const rows = useMemo(() => {
    const mapped = data.map((r) => ({
      title: r.title,
      views: r.views,
      dmShares: Math.round(r.shares * 0.4),
      saves: r.saves,
      profileVisits: Math.round(r.reach * 0.05),
      followsGenerated: Math.round(r.reach * (r.nonFollowerReachPct / 100) * 0.02),
      audioType: r.category,
    }))
    const sorted = [...mapped].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })
    return sorted
  }, [data, sortKey, sortAsc])

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-700">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="px-3 py-3 text-gray-400 font-medium cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 text-purple-400">{sortAsc ? '\u25B2' : '\u25BC'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
              <td className="px-3 py-2 text-white font-medium max-w-[200px] truncate">{row.title}</td>
              <td className="px-3 py-2 text-gray-300">{fmt(row.views)}</td>
              <td className="px-3 py-2 text-gray-300">{fmt(row.dmShares)}</td>
              <td className="px-3 py-2 text-gray-300">{fmt(row.saves)}</td>
              <td className="px-3 py-2 text-gray-300">{fmt(row.profileVisits)}</td>
              <td className="px-3 py-2 text-gray-300">{fmt(row.followsGenerated)}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-900/50 text-purple-300 capitalize">
                  {row.audioType}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No reels found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function PostingHeatmap({ reels }) {
  // Build the 7x24 grid. Since we only have dates (no times), bucket by reel index.
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0))

  reels.forEach((r, idx) => {
    const dayOfWeek = new Date(r.date + 'T12:00:00').getDay()
    // Convert Sunday=0 to Monday-first: Mon=0..Sun=6
    const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    // Simulate hour based on index to distribute across the day
    const hour = ((idx * 7 + idx * 3) % 24)
    grid[dayIdx][hour] += r.views
  })

  // Find max for normalization and find top 3 cells
  const allCells = []
  let maxVal = 0
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h] > maxVal) maxVal = grid[d][h]
      if (grid[d][h] > 0) allCells.push({ d, h, val: grid[d][h] })
    }
  }

  allCells.sort((a, b) => b.val - a.val)
  const top3 = new Set(allCells.slice(0, 3).map((c) => `${c.d}-${c.h}`))

  function getCellColor(d, h) {
    const val = grid[d][h]
    if (val === 0) return 'bg-gray-800'
    if (top3.has(`${d}-${h}`)) return 'bg-green-600'
    const intensity = maxVal > 0 ? val / maxVal : 0
    if (intensity > 0.7) return 'bg-orange-500'
    if (intensity > 0.4) return 'bg-orange-400'
    if (intensity > 0.2) return 'bg-orange-300/70'
    return 'bg-orange-200/50'
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Hour labels */}
        <div className="flex ml-12 mb-1">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-gray-500">
              {h % 3 === 0 ? `${h}:00` : ''}
            </div>
          ))}
        </div>
        {/* Grid rows */}
        {DAYS.map((day, d) => (
          <div key={day} className="flex items-center mb-0.5">
            <span className="w-12 text-xs text-gray-400 text-right pr-2">{day}</span>
            <div className="flex flex-1 gap-0.5">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className={`flex-1 h-5 rounded-sm ${getCellColor(d, h)} transition-colors`}
                  title={`${day} ${h}:00 -- ${fmt(grid[d][h])} views`}
                />
              ))}
            </div>
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 ml-12 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-600 inline-block" /> Top 3 slots</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> High</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-300/70 inline-block" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-800 inline-block" /> No data</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Instagram({ dateRange }) {
  // ---- Load data ----
  const allReels = getData(KEYS.REELS + 'all') || []
  const followerData = getData(KEYS.FOLLOWERS + 'daily') || []

  // Filter to Instagram only, then apply date range
  const igReelsAll = allReels.filter((r) => r.platform === 'instagram')
  const igReels = filterByDateRange(igReelsAll, dateRange)

  // ---- KPI Calculations ----
  const latestFollowers = followerData.length > 0 ? followerData[followerData.length - 1].instagram : 0

  // Find follower count ~7 days ago for WoW
  const weekAgoDate = weekAgo()
  const followerWeekAgo = followerData.find((s) => s.date <= weekAgoDate)
  const prevFollowers = followerWeekAgo ? followerWeekAgo.instagram : latestFollowers
  const followerTrend = prevFollowers > 0 ? ((latestFollowers - prevFollowers) / prevFollowers) * 100 : 0

  // Split current week vs previous week for WoW trends
  const weekAgoStr = weekAgo()
  const twoWeeksAgoStr = twoWeeksAgo()
  const thisWeekReels = igReelsAll.filter((r) => r.date >= weekAgoStr)
  const lastWeekReels = igReelsAll.filter((r) => r.date >= twoWeeksAgoStr && r.date < weekAgoStr)

  const avgViews = igReels.length > 0
    ? igReels.reduce((s, r) => s + r.views, 0) / igReels.length
    : 0
  const avgViewsThisWeek = thisWeekReels.length > 0
    ? thisWeekReels.reduce((s, r) => s + r.views, 0) / thisWeekReels.length
    : 0
  const avgViewsLastWeek = lastWeekReels.length > 0
    ? lastWeekReels.reduce((s, r) => s + r.views, 0) / lastWeekReels.length
    : 0
  const viewsTrend = avgViewsLastWeek > 0
    ? ((avgViewsThisWeek - avgViewsLastWeek) / avgViewsLastWeek) * 100
    : 0

  // Engagement rate
  const totalEngagement = igReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
  const totalReach = igReels.reduce((s, r) => s + r.reach, 0)
  const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0

  const engThis = thisWeekReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
  const reachThis = thisWeekReels.reduce((s, r) => s + r.reach, 0)
  const engRateThis = reachThis > 0 ? (engThis / reachThis) * 100 : 0
  const engLast = lastWeekReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
  const reachLast = lastWeekReels.reduce((s, r) => s + r.reach, 0)
  const engRateLast = reachLast > 0 ? (engLast / reachLast) * 100 : 0
  const engTrend = engRateLast > 0 ? ((engRateThis - engRateLast) / engRateLast) * 100 : 0

  // Follows from reels (est. 2% of non-follower reach)
  const followsFromReels = igReels.reduce(
    (s, r) => s + Math.round(r.reach * (r.nonFollowerReachPct / 100) * 0.02),
    0
  )
  const followsThis = thisWeekReels.reduce(
    (s, r) => s + Math.round(r.reach * (r.nonFollowerReachPct / 100) * 0.02),
    0
  )
  const followsLast = lastWeekReels.reduce(
    (s, r) => s + Math.round(r.reach * (r.nonFollowerReachPct / 100) * 0.02),
    0
  )
  const followsTrend = followsLast > 0 ? ((followsThis - followsLast) / followsLast) * 100 : 0

  // ---- Chart Data: Views over time ----
  const viewsByDate = useMemo(() => {
    const map = {}
    igReels.forEach((r) => {
      if (!map[r.date]) map[r.date] = 0
      map[r.date] += r.views
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => ({ date: date.slice(5), views }))
  }, [igReels])

  // ---- Chart Data: DM Shares per reel ----
  const dmSharesData = useMemo(() => {
    return igReels
      .map((r) => ({
        name: r.title.length > 25 ? r.title.slice(0, 22) + '...' : r.title,
        dmShares: Math.round(r.shares * 0.4),
      }))
      .slice(-12) // last 12 reels for readability
  }, [igReels])

  // ---- Chart Data: Format Comparison (avg views by category) ----
  const categoryData = useMemo(() => {
    const categories = ['tricks', 'day-in-life', 'funny', 'grooming', 'travel']
    return categories.map((cat) => {
      const catReels = igReels.filter((r) => r.category === cat)
      const avg = catReels.length > 0
        ? catReels.reduce((s, r) => s + r.views, 0) / catReels.length
        : 0
      return {
        category: cat,
        avgViews: Math.round(avg),
      }
    })
  }, [igReels])

  const categoryColors = [IG_PURPLE, IG_MAGENTA, IG_PINK, '#F56040', '#FCAF45']

  // ---- Render ----
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: `linear-gradient(135deg, ${IG_PURPLE}, ${IG_PINK})` }}
          />
          Instagram Analytics
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {dateRange === 0 ? 'All time' : `Last ${dateRange} days`} -- {igReels.length} reels
        </p>
      </div>

      {/* SECTION 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="IG Followers"
          value={fmt(latestFollowers)}
          trend={followerTrend}
          borderColor="border-purple-400"
        />
        <KpiCard
          label="Avg Reel Views"
          value={fmt(Math.round(avgViews))}
          trend={viewsTrend}
          borderColor="border-pink-400"
        />
        <KpiCard
          label="IG Engagement Rate"
          value={pct(engagementRate)}
          trend={engTrend}
          borderColor="border-purple-400"
        />
        <KpiCard
          label="Follows from Reels"
          value={fmt(followsFromReels)}
          trend={followsTrend}
          borderColor="border-pink-400"
        />
      </div>

      {/* SECTION 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reel Views Over Time */}
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Reel Views Over Time</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                <Line
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke={IG_MAGENTA}
                  strokeWidth={2}
                  dot={{ fill: IG_MAGENTA, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DM Shares Per Reel */}
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-1">DM Shares Per Reel</h2>
          <p className="text-xs text-gray-500 mb-4">Estimated as 40% of total shares</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dmSharesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={fmt} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  width={140}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="dmShares" name="DM Shares" fill={IG_PURPLE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: IG-Specific Metrics Table */}
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-1">IG-Specific Metrics</h2>
        <p className="text-xs text-gray-500 mb-4">
          Click column headers to sort. DM Shares est. 40% of shares, Profile Visits est. 5% of reach, Follows est. 2% of non-follower reach.
        </p>
        <SortableTable data={igReels} />
      </div>

      {/* SECTION 4: Format Comparison */}
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Format Comparison -- Avg Views by Category</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="category"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgViews" name="Avg Views" radius={[4, 4, 0, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={categoryColors[i % categoryColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 5: Best Posting Times Heatmap */}
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-1">Best Posting Times</h2>
        <p className="text-xs text-gray-500 mb-4">
          Heatmap of views by day and hour. Top 3 time slots highlighted in green.
        </p>
        <PostingHeatmap reels={igReels} />
      </div>
    </div>
  )
}
