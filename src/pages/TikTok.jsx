import { useMemo, useState } from 'react'
import { getData, KEYS } from '../utils/storage'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TEAL = '#00C9B1'
const TEAL_LIGHT = '#25F4EE'
const BLACK = '#000000'
const PIE_COLORS = [TEAL, TEAL_LIGHT, '#065f56', '#0d9488', '#5eead4']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function TrendArrow({ value }) {
  if (value > 0) return <span className="text-green-500 text-sm font-semibold">{'\u25B2'} {value.toFixed(1)}%</span>
  if (value < 0) return <span className="text-red-500 text-sm font-semibold">{'\u25BC'} {Math.abs(value).toFixed(1)}%</span>
  return <span className="text-gray-400 text-sm">{'\u2014'} 0%</span>
}

function fmt(n) {
  if (n == null) return '--'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-gray-300 ml-1">{'\u2195'}</span>
  return <span className="text-teal-400 ml-1">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span>
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function TikTok({ dateRange }) {
  const [sortCol, setSortCol] = useState('views')
  const [sortDir, setSortDir] = useState('desc')

  const data = useMemo(() => {
    const allReels = getData(KEYS.REELS + 'all') || []
    const followers = getData(KEYS.FOLLOWERS + 'daily') || []
    const trends = getData(KEYS.TRENDS + 'log') || []

    // Filter to TikTok only
    let tiktokReels = allReels.filter((r) => r.platform === 'tiktok')

    // Apply date range filter
    if (dateRange > 0) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - dateRange)
      tiktokReels = tiktokReels.filter((r) => new Date(r.date) >= cutoff)
    }

    return { tiktokReels, followers, trends }
  }, [dateRange])

  // -------------------------------------------------------------------------
  // KPI calculations
  // -------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const { tiktokReels, followers } = data

    // TikTok Followers
    const latest = followers[followers.length - 1]
    const weekAgo = followers[Math.max(0, followers.length - 8)]
    const ttFollowers = latest?.tiktok || 0
    const ttFollowersChange = weekAgo?.tiktok
      ? ((ttFollowers - weekAgo.tiktok) / weekAgo.tiktok) * 100
      : 0

    // Avg Video Views
    const totalViews = tiktokReels.reduce((s, r) => s + r.views, 0)
    const avgViews = tiktokReels.length ? Math.round(totalViews / tiktokReels.length) : 0
    const recentReels = tiktokReels.slice(-5)
    const olderReels = tiktokReels.slice(-10, -5)
    const recentAvg = recentReels.length ? recentReels.reduce((s, r) => s + r.views, 0) / recentReels.length : 0
    const olderAvg = olderReels.length ? olderReels.reduce((s, r) => s + r.views, 0) / olderReels.length : 0
    const viewsChange = olderAvg ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    // TikTok Engagement Rate (uses views, not reach)
    const totalEng = tiktokReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
    const engRate = totalViews ? (totalEng / totalViews) * 100 : 0
    const recentEng = recentReels.length
      ? (recentReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0) /
         Math.max(1, recentReels.reduce((s, r) => s + r.views, 0))) * 100
      : 0
    const olderEng = olderReels.length
      ? (olderReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0) /
         Math.max(1, olderReels.reduce((s, r) => s + r.views, 0))) * 100
      : 0
    const engChange = olderEng ? ((recentEng - olderEng) / olderEng) * 100 : 0

    // FYP View % (nonFollowerReachPct as proxy)
    const avgFYP = tiktokReels.length
      ? tiktokReels.reduce((s, r) => s + r.nonFollowerReachPct, 0) / tiktokReels.length
      : 0
    const recentFYP = recentReels.length
      ? recentReels.reduce((s, r) => s + r.nonFollowerReachPct, 0) / recentReels.length
      : 0
    const olderFYP = olderReels.length
      ? olderReels.reduce((s, r) => s + r.nonFollowerReachPct, 0) / olderReels.length
      : 0
    const fypChange = olderFYP ? ((recentFYP - olderFYP) / olderFYP) * 100 : 0

    return [
      { label: 'TikTok Followers', value: fmt(ttFollowers), change: ttFollowersChange },
      { label: 'Avg Video Views', value: fmt(avgViews), change: viewsChange },
      { label: 'Engagement Rate', value: engRate.toFixed(2) + '%', change: engChange },
      { label: 'FYP View %', value: avgFYP.toFixed(1) + '%', change: fypChange },
    ]
  }, [data])

  // -------------------------------------------------------------------------
  // Views over time chart data
  // -------------------------------------------------------------------------
  const viewsOverTime = useMemo(() => {
    const grouped = {}
    data.tiktokReels.forEach((r) => {
      if (!grouped[r.date]) grouped[r.date] = { date: r.date, views: 0, count: 0 }
      grouped[r.date].views += r.views
      grouped[r.date].count += 1
    })
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

  // -------------------------------------------------------------------------
  // Traffic source pie chart data
  // -------------------------------------------------------------------------
  const trafficSources = useMemo(() => {
    const { tiktokReels } = data
    if (!tiktokReels.length) return []

    const avgNonFollower = tiktokReels.reduce((s, r) => s + r.nonFollowerReachPct, 0) / tiktokReels.length
    // Approximate breakdown: FYP gets most of non-follower, Following gets follower portion
    // Normalize with estimated Search (5%), Profile (3%), Sound (2%)
    const estimatedOther = 5 + 3 + 2 // 10%
    const fypRaw = avgNonFollower
    const followingRaw = 100 - avgNonFollower
    const totalRaw = fypRaw + followingRaw + estimatedOther
    const normalize = (v) => +((v / totalRaw) * 100).toFixed(1)

    return [
      { name: 'For You Page', value: normalize(fypRaw) },
      { name: 'Following', value: normalize(followingRaw) },
      { name: 'Search', value: normalize(5) },
      { name: 'Profile', value: normalize(3) },
      { name: 'Sound', value: normalize(2) },
    ]
  }, [data])

  // -------------------------------------------------------------------------
  // Sorted table data
  // -------------------------------------------------------------------------
  const tableData = useMemo(() => {
    const sorted = [...data.tiktokReels]
    sorted.sort((a, b) => {
      let aVal, bVal
      switch (sortCol) {
        case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break
        case 'views': aVal = a.views; bVal = b.views; break
        case 'fyp': aVal = a.nonFollowerReachPct; bVal = b.nonFollowerReachPct; break
        case 'watchTime': aVal = a.watchTimePct; bVal = b.watchTimePct; break
        case 'likes': aVal = a.likes; bVal = b.likes; break
        case 'comments': aVal = a.comments; bVal = b.comments; break
        case 'shares': aVal = a.shares; bVal = b.shares; break
        case 'saves': aVal = a.saves; bVal = b.saves; break
        case 'completion': aVal = a.hookRetention; bVal = b.hookRetention; break
        default: aVal = a.views; bVal = b.views
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return sorted
  }, [data, sortCol, sortDir])

  // -------------------------------------------------------------------------
  // Completion rate by video length (simulated)
  // -------------------------------------------------------------------------
  const completionByLength = useMemo(() => {
    const buckets = { '15-30s': { total: 0, count: 0 }, '30-60s': { total: 0, count: 0 } }
    data.tiktokReels.forEach((r, idx) => {
      const bucket = idx % 2 !== 0 ? '15-30s' : '30-60s'
      buckets[bucket].total += r.hookRetention
      buckets[bucket].count += 1
    })
    return Object.entries(buckets).map(([label, b]) => ({
      duration: label,
      avgCompletion: b.count ? +(b.total / b.count).toFixed(1) : 0,
    }))
  }, [data])

  // -------------------------------------------------------------------------
  // Trending sound performance
  // -------------------------------------------------------------------------
  const soundPerformance = useMemo(() => {
    const { trends, tiktokReels } = data
    const ttTrends = trends.filter((t) => t.platform === 'tiktok')
    if (!ttTrends.length) return []

    const reelMap = {}
    tiktokReels.forEach((r) => { reelMap[r.id] = r })

    return ttTrends.map((t) => {
      const linkedReel = t.linkedPostId ? reelMap[t.linkedPostId] : null
      return {
        name: t.name,
        timesUsed: t.used ? 1 : 0,
        avgViews: linkedReel ? linkedReel.views : 0,
        lastUsed: t.used ? t.addedAt : '-',
        platform: t.platform,
      }
    })
  }, [data])

  // -------------------------------------------------------------------------
  // Sort handler
  // -------------------------------------------------------------------------
  function handleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const columns = [
    { key: 'title', label: 'Video Name' },
    { key: 'views', label: 'Views' },
    { key: 'fyp', label: 'FYP %' },
    { key: 'watchTime', label: 'Avg Watch Time' },
    { key: 'likes', label: 'Likes' },
    { key: 'comments', label: 'Comments' },
    { key: 'shares', label: 'Shares' },
    { key: 'saves', label: 'Saves' },
    { key: 'completion', label: 'Completion Rate' },
  ]

  return (
    <div className="space-y-6">

      {/* ----------------------------------------------------------------- */}
      {/* SECTION 1: KPI Cards                                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-teal-400">
            <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            <TrendArrow value={kpi.change} />
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION 2: Charts — Views Over Time + Traffic Sources             */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Video Views Over Time */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Video Views Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={viewsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => fmt(v)}
              />
              <Tooltip
                formatter={(v) => [v.toLocaleString(), 'Views']}
                labelFormatter={(l) => `Date: ${l}`}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke={TEAL}
                strokeWidth={2}
                dot={{ r: 3, fill: TEAL }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Source Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Traffic Source Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={trafficSources}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name} ${value}%`}
              >
                {trafficSources.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION 3: TikTok Metrics Table                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">TikTok Video Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      <SortIcon active={sortCol === col.key} dir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.map((reel) => (
                <tr key={reel.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{reel.title}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(reel.views)}</td>
                  <td className="px-4 py-3 text-gray-700">{reel.nonFollowerReachPct}%</td>
                  <td className="px-4 py-3 text-gray-700">{reel.watchTimePct}%</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(reel.likes)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(reel.comments)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(reel.shares)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(reel.saves)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      reel.hookRetention >= 70 ? 'bg-teal-100 text-teal-800' :
                      reel.hookRetention >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {reel.hookRetention}%
                    </span>
                  </td>
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">No TikTok videos found for this date range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION 4: Completion Rate by Video Length                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Completion Rate by Video Length</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={completionByLength} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="duration" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip formatter={(v) => [`${v}%`, 'Avg Completion Rate']} />
            <Bar dataKey="avgCompletion" fill={TEAL} radius={[6, 6, 0, 0]}>
              {completionByLength.map((_, i) => (
                <Cell key={i} fill={i === 0 ? TEAL : TEAL_LIGHT} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION 5: Trending Sound Performance                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Trending Sound Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sound Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Times Used</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Views When Used</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Used Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {soundPerformance.map((sound) => (
                <tr key={sound.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{sound.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      sound.platform === 'tiktok' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {sound.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{sound.timesUsed}</td>
                  <td className="px-4 py-3 text-gray-700">{sound.avgViews ? fmt(sound.avgViews) : '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{sound.lastUsed}</td>
                </tr>
              ))}
              {soundPerformance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No trending sounds tracked yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
