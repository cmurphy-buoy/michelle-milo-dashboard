import { useMemo, useState } from 'react'
import { getData, KEYS } from '../utils/storage'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FB_BLUE = '#1877F2'
const FB_DARK = '#4267B2'
const IG_PINK = '#E1306C'

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function TrendArrow({ value }) {
  if (value > 0) return <span className="text-green-500 text-sm font-semibold">&#9650; {value.toFixed(1)}%</span>
  if (value < 0) return <span className="text-red-500 text-sm font-semibold">&#9660; {Math.abs(value).toFixed(1)}%</span>
  return <span className="text-gray-400 text-sm">&mdash; 0%</span>
}

const DEMO_OPTIONS = ['25-34', '35-44', '18-24']

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Facebook({ dateRange }) {
  const [sortCol, setSortCol] = useState('views')
  const [sortAsc, setSortAsc] = useState(false)

  const data = useMemo(() => {
    const allReels = getData(KEYS.REELS + 'all') || []
    const followers = getData(KEYS.FOLLOWERS + 'daily') || []

    // Filter reels by date range
    const filteredReels = dateRange > 0
      ? allReels.filter((r) => {
          const d = new Date(r.date)
          const ago = new Date()
          ago.setDate(ago.getDate() - dateRange)
          return d >= ago
        })
      : allReels

    const fbReels = filteredReels.filter((r) => r.platform === 'facebook')
    const igReels = filteredReels.filter((r) => r.platform === 'instagram')

    // Follower data (filtered by dateRange)
    const cutoff = dateRange > 0 ? followers.length - dateRange : 0
    const filteredFollowers = followers.slice(Math.max(0, cutoff))

    return { fbReels, igReels, allReels: filteredReels, followers: filteredFollowers, allFollowers: followers }
  }, [dateRange])

  // -----------------------------------------------------------------------
  // KPI calculations
  // -----------------------------------------------------------------------

  const kpis = useMemo(() => {
    const { fbReels, followers, allFollowers } = data

    // FB Followers
    const latest = followers[followers.length - 1]
    const weekAgo = followers[Math.max(0, followers.length - 8)]
    const fbFollowers = latest?.facebook || 0
    const fbFollowersChange = weekAgo?.facebook
      ? ((fbFollowers - weekAgo.facebook) / weekAgo.facebook) * 100
      : 0

    // Avg Reel Views
    const totalViews = fbReels.reduce((s, r) => s + r.views, 0)
    const avgViews = fbReels.length ? Math.round(totalViews / fbReels.length) : 0
    const recentReels = fbReels.slice(-5)
    const olderReels = fbReels.slice(-10, -5)
    const recentAvg = recentReels.length ? recentReels.reduce((s, r) => s + r.views, 0) / recentReels.length : 0
    const olderAvg = olderReels.length ? olderReels.reduce((s, r) => s + r.views, 0) / olderReels.length : 0
    const viewsChange = olderAvg ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    // Engagement Rate
    const totalEngagement = fbReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
    const totalReach = fbReels.reduce((s, r) => s + r.reach, 0)
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

    // Suggested Video Rate (nonFollowerReachPct * 0.6)
    const avgSuggested = fbReels.length
      ? fbReels.reduce((s, r) => s + r.nonFollowerReachPct * 0.6, 0) / fbReels.length
      : 0
    const recentSugg = recentReels.length
      ? recentReels.reduce((s, r) => s + r.nonFollowerReachPct * 0.6, 0) / recentReels.length
      : 0
    const olderSugg = olderReels.length
      ? olderReels.reduce((s, r) => s + r.nonFollowerReachPct * 0.6, 0) / olderReels.length
      : 0
    const suggChange = olderSugg ? ((recentSugg - olderSugg) / olderSugg) * 100 : 0

    return [
      { label: 'FB Followers', value: fbFollowers.toLocaleString(), change: fbFollowersChange },
      { label: 'Avg Reel Views', value: fmt(avgViews), change: viewsChange },
      { label: 'FB Engagement Rate', value: engRate.toFixed(2) + '%', change: engChange },
      { label: 'Suggested Video Rate', value: avgSuggested.toFixed(1) + '%', change: suggChange },
    ]
  }, [data])

  // -----------------------------------------------------------------------
  // Chart Data: Reel views over time
  // -----------------------------------------------------------------------

  const viewsOverTime = useMemo(() => {
    const { fbReels } = data
    const byDate = {}
    fbReels.forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date, views: 0, count: 0 }
      byDate[r.date].views += r.views
      byDate[r.date].count += 1
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

  // -----------------------------------------------------------------------
  // Chart Data: Cross-post comparison
  // -----------------------------------------------------------------------

  const crossPostData = useMemo(() => {
    const { fbReels, igReels } = data

    // Build maps: title -> views for each platform
    const fbMap = {}
    fbReels.forEach((r) => {
      if (!fbMap[r.title]) fbMap[r.title] = []
      fbMap[r.title].push(r.views)
    })
    const igMap = {}
    igReels.forEach((r) => {
      if (!igMap[r.title]) igMap[r.title] = []
      igMap[r.title].push(r.views)
    })

    // Find titles that exist on both platforms
    const sharedTitles = Object.keys(fbMap).filter((t) => igMap[t])

    if (sharedTitles.length > 0) {
      return sharedTitles.slice(0, 8).map((title) => {
        const fbAvg = Math.round(fbMap[title].reduce((a, b) => a + b, 0) / fbMap[title].length)
        const igAvg = Math.round(igMap[title].reduce((a, b) => a + b, 0) / igMap[title].length)
        const shortTitle = title.length > 25 ? title.slice(0, 22) + '...' : title
        return { name: shortTitle, fbViews: fbAvg, igViews: igAvg }
      })
    }

    // Fallback: compare average views per reel by platform
    const fbAvg = fbReels.length ? Math.round(fbReels.reduce((s, r) => s + r.views, 0) / fbReels.length) : 0
    const igAvg = igReels.length ? Math.round(igReels.reduce((s, r) => s + r.views, 0) / igReels.length) : 0
    return [{ name: 'Avg Views / Reel', fbViews: fbAvg, igViews: igAvg }]
  }, [data])

  // -----------------------------------------------------------------------
  // Table data (sortable)
  // -----------------------------------------------------------------------

  const tableData = useMemo(() => {
    const { fbReels } = data
    const rows = fbReels.map((r, idx) => ({
      id: r.id,
      title: r.title,
      views: r.views,
      messengerShares: Math.round(r.shares * 0.5),
      likes: r.likes,
      comments: r.comments,
      suggestedPct: +(r.nonFollowerReachPct * 0.6).toFixed(1),
      topDemo: DEMO_OPTIONS[idx % DEMO_OPTIONS.length],
    }))

    rows.sort((a, b) => {
      const valA = a[sortCol]
      const valB = b[sortCol]
      if (typeof valA === 'string') return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      return sortAsc ? valA - valB : valB - valA
    })

    return rows
  }, [data, sortCol, sortAsc])

  // -----------------------------------------------------------------------
  // Demographics (static)
  // -----------------------------------------------------------------------

  const ageDemoData = [
    { name: '18-24', value: 20, color: '#1877F2' },
    { name: '25-34', value: 35, color: '#4267B2' },
    { name: '35-44', value: 25, color: '#5B8DEF' },
    { name: '45-54', value: 12, color: '#89ABF2' },
    { name: '55+', value: 8, color: '#B3CCF5' },
  ]

  const locationData = [
    { name: 'United States', value: 60, color: '#1877F2' },
    { name: 'United Kingdom', value: 15, color: '#4267B2' },
    { name: 'Canada', value: 10, color: '#5B8DEF' },
    { name: 'Australia', value: 8, color: '#89ABF2' },
    { name: 'Other', value: 7, color: '#B3CCF5' },
  ]

  // -----------------------------------------------------------------------
  // Sort handler
  // -----------------------------------------------------------------------

  function handleSort(col) {
    if (sortCol === col) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(col)
      setSortAsc(false)
    }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <span className="text-gray-300 ml-1">&#8597;</span>
    return <span className="ml-1">{sortAsc ? '\u25B2' : '\u25BC'}</span>
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* ---- SECTION 1: KPI Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
            <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            <TrendArrow value={kpi.change} />
          </div>
        ))}
      </div>

      {/* ---- SECTION 2: Charts ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Reel views over time */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">FB Reel Views Over Time</h3>
          {viewsOverTime.length === 0 ? (
            <p className="text-gray-400 text-sm py-10 text-center">No Facebook reel data in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={viewsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => v.toLocaleString()} labelFormatter={(l) => `Date: ${l}`} />
                <Line type="monotone" dataKey="views" stroke={FB_BLUE} strokeWidth={2} dot={{ r: 3, fill: FB_BLUE }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cross-post comparison: FB vs IG */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Cross-Post Comparison: FB vs IG</h3>
          <p className="text-xs text-gray-400 mb-4">
            {crossPostData.length === 1 && crossPostData[0].name === 'Avg Views / Reel'
              ? 'No exact title matches found — showing average views per reel by platform.'
              : 'Matching reels posted on both platforms.'}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={crossPostData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => v.toLocaleString()} />
              <Legend />
              <Bar dataKey="fbViews" name="Facebook" fill={FB_BLUE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="igViews" name="Instagram" fill={IG_PINK} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- SECTION 3: FB Metrics Table ---- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Facebook Reel Performance</h3>
          <p className="text-xs text-gray-400 mt-0.5">{tableData.length} reels</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                {[
                  { key: 'title', label: 'Reel Name' },
                  { key: 'views', label: 'Views' },
                  { key: 'messengerShares', label: 'Messenger Shares' },
                  { key: 'likes', label: 'Likes' },
                  { key: 'comments', label: 'Comments' },
                  { key: 'suggestedPct', label: 'Suggested %' },
                  { key: 'topDemo', label: 'Top Demo' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No Facebook reels in this period.</td>
                </tr>
              ) : (
                tableData.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[220px] truncate">{row.title}</td>
                    <td className="px-4 py-3 text-gray-700">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.messengerShares.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.comments.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.suggestedPct}%</td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {row.topDemo}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- SECTION 4: Audience Demographics ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Age Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Audience Age Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={ageDemoData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={{ stroke: '#cbd5e1' }}
              >
                {ageDemoData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Locations */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Audience Locations</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={locationData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                dataKey="value"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={{ stroke: '#cbd5e1' }}
              >
                {locationData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
