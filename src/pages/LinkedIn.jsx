import { useMemo, useState } from 'react'
import { getData, KEYS } from '../utils/storage'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LI_BLUE = '#0A66C2'
const LI_DARK = '#004182'
const LI_LIGHT = '#70B5F9'

function fmt(n) {
  if (n == null) return '--'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function TrendArrow({ value }) {
  if (value > 0) return <span className="text-green-500 text-sm font-semibold">{'\u25B2'} {value.toFixed(1)}%</span>
  if (value < 0) return <span className="text-red-500 text-sm font-semibold">{'\u25BC'} {Math.abs(value).toFixed(1)}%</span>
  return <span className="text-gray-400 text-sm">{'\u2014'} 0%</span>
}

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-gray-300 ml-1">{'\u2195'}</span>
  return <span className="ml-1">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span>
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function LinkedIn({ dateRange }) {
  const [sortCol, setSortCol] = useState('views')
  const [sortAsc, setSortAsc] = useState(false)

  const data = useMemo(() => {
    const allReels = getData(KEYS.REELS + 'all') || []
    const followers = getData(KEYS.FOLLOWERS + 'daily') || []

    // Filter by date range
    const filteredReels = dateRange > 0
      ? allReels.filter((r) => {
          const d = new Date(r.date)
          const ago = new Date()
          ago.setDate(ago.getDate() - dateRange)
          return d >= ago
        })
      : allReels

    const liPosts = filteredReels.filter((r) => r.platform === 'linkedin')

    // Follower data (filtered by dateRange)
    const cutoff = dateRange > 0 ? followers.length - dateRange : 0
    const filteredFollowers = followers.slice(Math.max(0, cutoff))

    return { liPosts, allReels: filteredReels, followers: filteredFollowers }
  }, [dateRange])

  // -----------------------------------------------------------------------
  // KPI calculations
  // -----------------------------------------------------------------------

  const kpis = useMemo(() => {
    const { liPosts, followers } = data

    // LinkedIn Followers
    const latest = followers[followers.length - 1]
    const weekAgo = followers[Math.max(0, followers.length - 8)]
    const liFollowers = latest?.linkedin || 0
    const liFollowersChange = weekAgo?.linkedin
      ? ((liFollowers - weekAgo.linkedin) / weekAgo.linkedin) * 100
      : 0

    // Avg Post Views
    const totalViews = liPosts.reduce((s, r) => s + r.views, 0)
    const avgViews = liPosts.length ? Math.round(totalViews / liPosts.length) : 0
    const recentPosts = liPosts.slice(-5)
    const olderPosts = liPosts.slice(-10, -5)
    const recentAvg = recentPosts.length ? recentPosts.reduce((s, r) => s + r.views, 0) / recentPosts.length : 0
    const olderAvg = olderPosts.length ? olderPosts.reduce((s, r) => s + r.views, 0) / olderPosts.length : 0
    const viewsChange = olderAvg ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    // Engagement Rate
    const totalEngagement = liPosts.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
    const totalReach = liPosts.reduce((s, r) => s + r.reach, 0)
    const engRate = totalReach ? (totalEngagement / totalReach) * 100 : 0
    const recentEng = recentPosts.length
      ? (recentPosts.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0) /
         Math.max(1, recentPosts.reduce((s, r) => s + r.reach, 0))) * 100
      : 0
    const olderEng = olderPosts.length
      ? (olderPosts.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0) /
         Math.max(1, olderPosts.reduce((s, r) => s + r.reach, 0))) * 100
      : 0
    const engChange = olderEng ? ((recentEng - olderEng) / olderEng) * 100 : 0

    // Profile Views (estimated from reach)
    const avgProfileViews = liPosts.length
      ? Math.round(liPosts.reduce((s, r) => s + r.reach * 0.08, 0) / liPosts.length)
      : 0
    const recentProfile = recentPosts.length
      ? recentPosts.reduce((s, r) => s + r.reach * 0.08, 0) / recentPosts.length
      : 0
    const olderProfile = olderPosts.length
      ? olderPosts.reduce((s, r) => s + r.reach * 0.08, 0) / olderPosts.length
      : 0
    const profileChange = olderProfile ? ((recentProfile - olderProfile) / olderProfile) * 100 : 0

    return [
      { label: 'LinkedIn Followers', value: liFollowers.toLocaleString(), change: liFollowersChange },
      { label: 'Avg Post Views', value: fmt(avgViews), change: viewsChange },
      { label: 'Engagement Rate', value: engRate.toFixed(2) + '%', change: engChange },
      { label: 'Profile Views (est.)', value: fmt(avgProfileViews), change: profileChange },
    ]
  }, [data])

  // -----------------------------------------------------------------------
  // Chart Data: Views over time
  // -----------------------------------------------------------------------

  const viewsOverTime = useMemo(() => {
    const { liPosts } = data
    const byDate = {}
    liPosts.forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date, views: 0, count: 0 }
      byDate[r.date].views += r.views
      byDate[r.date].count += 1
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

  // -----------------------------------------------------------------------
  // Chart Data: Content type comparison
  // -----------------------------------------------------------------------

  const contentTypeData = useMemo(() => {
    const { liPosts } = data
    const types = {
      'Articles': { views: 0, count: 0 },
      'Videos': { views: 0, count: 0 },
      'Text Posts': { views: 0, count: 0 },
    }

    liPosts.forEach((r, i) => {
      // Simulate content types based on category
      const cat = r.category
      if (cat === 'tricks' || cat === 'funny' || cat === 'grooming') {
        types['Videos'].views += r.views
        types['Videos'].count += 1
      } else if (cat === 'travel' || cat === 'day-in-life') {
        types['Articles'].views += r.views
        types['Articles'].count += 1
      } else {
        types['Text Posts'].views += r.views
        types['Text Posts'].count += 1
      }
    })

    return Object.entries(types).map(([name, data]) => ({
      name,
      avgViews: data.count > 0 ? Math.round(data.views / data.count) : 0,
      count: data.count,
    }))
  }, [data])

  // -----------------------------------------------------------------------
  // Table data (sortable)
  // -----------------------------------------------------------------------

  const tableData = useMemo(() => {
    const { liPosts } = data
    const rows = liPosts.map((r) => ({
      id: r.id,
      title: r.title,
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      reposts: r.shares,
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

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* ---- SECTION 1: KPI Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-[#0A66C2]">
            <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            <TrendArrow value={kpi.change} />
          </div>
        ))}
      </div>

      {/* ---- SECTION 2: Charts ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Post views over time */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">LinkedIn Post Views Over Time</h3>
          {viewsOverTime.length === 0 ? (
            <p className="text-gray-400 text-sm py-10 text-center">No LinkedIn post data in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={viewsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip formatter={(v) => v.toLocaleString()} labelFormatter={(l) => `Date: ${l}`} />
                <Line type="monotone" dataKey="views" stroke={LI_BLUE} strokeWidth={2} dot={{ r: 3, fill: LI_BLUE }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Content type comparison */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Content Type Comparison</h3>
          <p className="text-xs text-gray-400 mb-4">Average views by content format</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={contentTypeData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => v.toLocaleString()} />
              <Legend />
              <Bar dataKey="avgViews" name="Avg Views" radius={[4, 4, 0, 0]}>
                {contentTypeData.map((_, i) => (
                  <Cell key={i} fill={[LI_BLUE, LI_DARK, LI_LIGHT][i % 3]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- SECTION 3: Post Performance Table ---- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">LinkedIn Post Performance</h3>
          <p className="text-xs text-gray-400 mt-0.5">{tableData.length} posts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                {[
                  { key: 'title', label: 'Post Name' },
                  { key: 'views', label: 'Views' },
                  { key: 'likes', label: 'Likes' },
                  { key: 'comments', label: 'Comments' },
                  { key: 'reposts', label: 'Reposts' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon active={sortCol === col.key} dir={sortAsc ? 'asc' : 'desc'} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No LinkedIn posts in this period.</td>
                </tr>
              ) : (
                tableData.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[220px] truncate">{row.title}</td>
                    <td className="px-4 py-3 text-gray-700">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.comments.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.reposts.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
