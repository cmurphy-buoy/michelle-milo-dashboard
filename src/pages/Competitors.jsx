import { useState, useMemo, useCallback } from 'react'
import { getData, saveData, KEYS } from '../utils/storage'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = ['instagram', 'tiktok', 'facebook']
const MAX_COMPETITORS = 5

const COLORS = {
  mm:     '#ea580c', // orange-600 — Michelle & Milo primary
  comp1:  '#92400e', // amber-800
  comp2:  '#b45309', // amber-700
  comp3:  '#d97706', // amber-500
  comp4:  '#f59e0b', // amber-400
  comp5:  '#fbbf24', // amber-300
}
const COMP_PALETTE = [COLORS.comp1, COLORS.comp2, COLORS.comp3, COLORS.comp4, COLORS.comp5]

function fmt(n) {
  if (n == null) return '--'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function pct(n) {
  if (n == null) return '--'
  return n.toFixed(2) + '%'
}

function filterByDateRange(arr, dateRange) {
  if (!arr || arr.length === 0) return []
  if (!dateRange || dateRange <= 0) return arr
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - dateRange)
  return arr.filter((d) => new Date(d.date) >= cutoff)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ children }) {
  return <h2 className="text-lg font-semibold text-amber-900">{children}</h2>
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow p-5 ${className}`}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SECTION 1 — Competitor Entry Form
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  name: '', handle: '', platform: 'instagram',
  followers: '', avgViews: '', engagementRate: '', postsPerWeek: '',
}

function CompetitorForm({ accounts, onAdd, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const change = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.handle.trim()) {
      setError('Name and handle are required.')
      return
    }
    if (accounts.length >= MAX_COMPETITORS) {
      setError(`Maximum ${MAX_COMPETITORS} competitors allowed.`)
      return
    }
    onAdd({
      name: form.name.trim(),
      handle: form.handle.trim(),
      platform: form.platform,
      followers: Number(form.followers) || 0,
      avgViews: Number(form.avgViews) || 0,
      engagementRate: Number(form.engagementRate) || 0,
      postsPerWeek: Number(form.postsPerWeek) || 0,
    })
    setForm(EMPTY_FORM)
  }

  const inputCls =
    'w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  return (
    <Card>
      <SectionHeading>Manage Competitors</SectionHeading>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <input placeholder="Account Name" value={form.name} onChange={change('name')} className={inputCls} />
        <input placeholder="@handle" value={form.handle} onChange={change('handle')} className={inputCls} />
        <select value={form.platform} onChange={change('platform')} className={inputCls}>
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <input placeholder="Follower Count" type="number" min="0" value={form.followers} onChange={change('followers')} className={inputCls} />
        <input placeholder="Avg Views/Reel" type="number" min="0" value={form.avgViews} onChange={change('avgViews')} className={inputCls} />
        <input placeholder="Engagement Rate %" type="number" min="0" step="0.01" value={form.engagementRate} onChange={change('engagementRate')} className={inputCls} />
        <input placeholder="Posts/Week" type="number" min="0" value={form.postsPerWeek} onChange={change('postsPerWeek')} className={inputCls} />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition disabled:opacity-50"
          disabled={accounts.length >= MAX_COMPETITORS}
        >
          + Add Competitor
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {accounts.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-200 text-left text-amber-800">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Handle</th>
                <th className="py-2 pr-3 font-medium">Platform</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-amber-100">
                  <td className="py-2 pr-3 font-medium text-amber-900">{a.name}</td>
                  <td className="py-2 pr-3 text-gray-600">{a.handle}</td>
                  <td className="py-2 pr-3 capitalize text-gray-600">{a.platform}</td>
                  <td className="py-2">
                    <button
                      onClick={() => onDelete(a.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {accounts.length === 0 && (
        <p className="mt-4 text-sm text-gray-400">No competitors added yet. Add up to {MAX_COMPETITORS}.</p>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// SECTION 2 — Rank Cards
// ---------------------------------------------------------------------------

function RankCards({ mmData, competitors, history, mmReels }) {
  const rankings = useMemo(() => {
    if (!mmData) return null

    const mmFollowers = mmData.instagram || 0
    // Use actual reel data for views and engagement
    const totalViews = mmReels.reduce((s, r) => s + r.views, 0)
    const mmAvgViews = mmReels.length ? Math.round(totalViews / mmReels.length) : 0
    const totalEng = mmReels.reduce((s, r) => s + r.likes + r.comments + r.shares + r.saves, 0)
    const totalReach = mmReels.reduce((s, r) => s + r.reach, 0)
    const mmEngagement = totalReach > 0 ? +((totalEng / totalReach) * 100).toFixed(2) : 0

    const entries = [
      { name: 'Michelle & Milo', followers: mmFollowers, avgViews: mmAvgViews, engagementRate: mmEngagement },
    ]

    competitors.forEach((c) => {
      const h = history[c.id]
      if (h && h.length > 0) {
        const latest = h[h.length - 1]
        entries.push({
          name: c.name,
          followers: latest.followers,
          avgViews: latest.avgViews,
          engagementRate: latest.engagementRate,
        })
      }
    })

    const byFollowers = [...entries].sort((a, b) => b.followers - a.followers)
    const byViews = [...entries].sort((a, b) => b.avgViews - a.avgViews)
    const byEngagement = [...entries].sort((a, b) => b.engagementRate - a.engagementRate)

    const followerRank = byFollowers.findIndex((e) => e.name === 'Michelle & Milo') + 1
    const viewsRank = byViews.findIndex((e) => e.name === 'Michelle & Milo') + 1
    const engagementRank = byEngagement.findIndex((e) => e.name === 'Michelle & Milo') + 1

    return {
      followers: { rank: followerRank, total: entries.length, value: mmFollowers },
      views: { rank: viewsRank, total: entries.length, value: mmAvgViews },
      engagement: { rank: engagementRank, total: entries.length, value: mmEngagement },
    }
  }, [mmData, competitors, history])

  if (!rankings) return null

  const cards = [
    { label: 'Follower Rank', ...rankings.followers, display: fmt(rankings.followers.value) },
    { label: 'Avg Views Rank', ...rankings.views, display: fmt(rankings.views.value) },
    { label: 'Engagement Rank', ...rankings.engagement, display: pct(rankings.engagement.value) },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c) => {
        const isFirst = c.rank === 1
        const bg = isFirst ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        const badge = isFirst
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
        return (
          <div key={c.label} className={`rounded-2xl border shadow p-5 ${bg}`}>
            <p className="text-sm font-medium text-gray-600">{c.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-2xl font-bold text-amber-900">{c.display}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge}`}>
                #{c.rank} of {c.total}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SECTION 3 — Comparison Charts (2x2)
// ---------------------------------------------------------------------------

function ComparisonCharts({ mmFollowers, competitors, history, dateRange }) {
  const { followerData, viewsData, engagementData, growthData } = useMemo(() => {
    const filtered = filterByDateRange(mmFollowers, dateRange)

    // ---- Follower line chart data ----
    const followerData = filtered.map((d) => {
      const point = { date: d.date.slice(5), 'M&M': d.instagram }
      competitors.forEach((c) => {
        const h = history[c.id]
        if (h) {
          const match = h.find((hd) => hd.date === d.date)
          if (match) point[c.name] = match.followers
        }
      })
      return point
    })

    // ---- Bar chart data (latest values) ----
    const latestMM = filtered.length > 0 ? filtered[filtered.length - 1] : null
    const barEntries = [
      {
        name: 'M&M',
        avgViews: latestMM ? Math.round(latestMM.instagram * 0.8) : 0,
        engagementRate: 5.2,
      },
    ]
    competitors.forEach((c) => {
      const h = history[c.id]
      if (h && h.length > 0) {
        const latest = h[h.length - 1]
        barEntries.push({
          name: c.name.length > 12 ? c.name.slice(0, 12) + '..' : c.name,
          avgViews: latest.avgViews,
          engagementRate: latest.engagementRate,
        })
      }
    })

    const viewsData = barEntries.map((e) => ({ name: e.name, views: e.avgViews }))
    const engagementData = barEntries.map((e) => ({ name: e.name, rate: e.engagementRate }))

    // ---- Growth rate bar chart (% change over filtered period) ----
    const mmFirst = filtered.length > 1 ? filtered[0].instagram : null
    const mmLast = filtered.length > 1 ? filtered[filtered.length - 1].instagram : null
    const mmGrowth = mmFirst && mmLast ? ((mmLast - mmFirst) / mmFirst) * 100 : 0

    const growthData = [{ name: 'M&M', growth: +mmGrowth.toFixed(2) }]
    competitors.forEach((c) => {
      const h = filterByDateRange(history[c.id], dateRange)
      if (h && h.length > 1) {
        const first = h[0].followers
        const last = h[h.length - 1].followers
        const g = first > 0 ? ((last - first) / first) * 100 : 0
        growthData.push({
          name: c.name.length > 12 ? c.name.slice(0, 12) + '..' : c.name,
          growth: +g.toFixed(2),
        })
      }
    })

    return { followerData, viewsData, engagementData, growthData }
  }, [mmFollowers, competitors, history, dateRange])

  const barColors = [COLORS.mm, ...COMP_PALETTE]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Follower Comparison Line */}
      <Card>
        <SectionHeading>Follower Comparison</SectionHeading>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={followerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="M&M" stroke={COLORS.mm} strokeWidth={2.5} dot={false} />
              {competitors.map((c, i) => (
                <Line key={c.id} type="monotone" dataKey={c.name} stroke={COMP_PALETTE[i % COMP_PALETTE.length]} strokeWidth={1.5} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Average Views Bar */}
      <Card>
        <SectionHeading>Average Views / Reel</SectionHeading>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="views" radius={[6, 6, 0, 0]}>
                {viewsData.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Engagement Rate Bar */}
      <Card>
        <SectionHeading>Engagement Rate (%)</SectionHeading>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => v + '%'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => pct(v)} />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                {engagementData.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Growth Rate Bar */}
      <Card>
        <SectionHeading>Growth Rate (% over period)</SectionHeading>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => v + '%'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => v + '%'} />
              <Bar dataKey="growth" radius={[6, 6, 0, 0]}>
                {growthData.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SECTION 4 — Gap Analysis Table
// ---------------------------------------------------------------------------

function GapAnalysis({ mmFollowers, competitors, history, dateRange }) {
  const rows = useMemo(() => {
    const filtered = filterByDateRange(mmFollowers, dateRange)
    if (filtered.length < 2) return []

    const mmLatest = filtered[filtered.length - 1].instagram
    const mmFirst = filtered[0].instagram
    const days = filtered.length - 1
    const mmDailyGrowth = days > 0 ? (mmLatest - mmFirst) / days : 0

    return competitors.map((c) => {
      const h = history[c.id]
      if (!h || h.length === 0) return null
      const latest = h[h.length - 1]
      const gap = mmLatest - latest.followers
      const ahead = gap >= 0

      let daysToOvertake = null
      if (!ahead && mmDailyGrowth > 0) {
        // How many days until M&M catches up
        const compFiltered = filterByDateRange(h, dateRange)
        const compFirst = compFiltered.length > 1 ? compFiltered[0].followers : latest.followers
        const compDays = compFiltered.length - 1
        const compDailyGrowth = compDays > 0 ? (latest.followers - compFirst) / compDays : 0
        const netGain = mmDailyGrowth - compDailyGrowth
        if (netGain > 0) {
          daysToOvertake = Math.ceil(Math.abs(gap) / netGain)
        }
      }

      return {
        name: c.name,
        handle: c.handle,
        theirFollowers: latest.followers,
        gap,
        ahead,
        daysToOvertake,
      }
    }).filter(Boolean)
  }, [mmFollowers, competitors, history, dateRange])

  if (rows.length === 0) return null

  return (
    <Card>
      <SectionHeading>Gap Analysis</SectionHeading>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-200 text-left text-amber-800">
              <th className="py-2 pr-4 font-medium">Competitor</th>
              <th className="py-2 pr-4 font-medium">Their Followers</th>
              <th className="py-2 pr-4 font-medium">Gap</th>
              <th className="py-2 font-medium">Days to Overtake</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-amber-100">
                <td className="py-3 pr-4">
                  <span className="font-medium text-amber-900">{r.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{r.handle}</span>
                </td>
                <td className="py-3 pr-4 text-gray-700">{fmt(r.theirFollowers)}</td>
                <td className={`py-3 pr-4 font-semibold ${r.ahead ? 'text-green-600' : 'text-red-600'}`}>
                  {r.ahead ? '+' : ''}{fmt(r.gap)}
                </td>
                <td className="py-3 text-gray-700">
                  {r.ahead ? (
                    <span className="text-green-600 font-medium">Ahead</span>
                  ) : r.daysToOvertake != null ? (
                    <span className="text-red-600">~{r.daysToOvertake} days</span>
                  ) : (
                    <span className="text-red-600">Growing slower</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// SECTION 5 — Industry Benchmarks (Pet Influencer Niche)
// ---------------------------------------------------------------------------

const BENCHMARKS = [
  {
    label: 'Avg Engagement (50K tier)',
    benchmark: 4.5,
    unit: '%',
    mmValueFn: () => 5.2,
    format: (v) => v.toFixed(1) + '%',
  },
  {
    label: 'Views-to-Follower Ratio',
    benchmark: 1.5,
    unit: 'x',
    mmValueFn: (mmFollowers) => {
      if (!mmFollowers) return 0
      const latest = mmFollowers.instagram || 0
      const views = Math.round(latest * 0.8)
      return latest > 0 ? +(views / latest).toFixed(2) : 0
    },
    format: (v) => v.toFixed(2) + 'x',
  },
  {
    label: 'Brand Deal CPM Range',
    benchmark: 22.5, // midpoint of $15-$30
    unit: '',
    mmValueFn: () => 24,
    format: (v) => '$' + v.toFixed(0),
    benchmarkDisplay: '$15 - $30',
  },
]

function IndustryBenchmarks({ mmFollowersLatest }) {
  return (
    <Card>
      <SectionHeading>Industry Benchmarks (Pet Influencer Niche)</SectionHeading>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {BENCHMARKS.map((b) => {
          const mmVal = b.mmValueFn(mmFollowersLatest)
          let status, bgColor, borderColor, statusLabel
          if (mmVal > b.benchmark * 1.05) {
            status = 'above'
            bgColor = 'bg-green-50'
            borderColor = 'border-green-300'
            statusLabel = 'Above Benchmark'
          } else if (mmVal < b.benchmark * 0.95) {
            status = 'below'
            bgColor = 'bg-red-50'
            borderColor = 'border-red-300'
            statusLabel = 'Below Benchmark'
          } else {
            status = 'at'
            bgColor = 'bg-yellow-50'
            borderColor = 'border-yellow-300'
            statusLabel = 'At Benchmark'
          }

          return (
            <div key={b.label} className={`rounded-xl border p-4 ${bgColor} ${borderColor}`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{b.label}</p>
              <p className="mt-2 text-xl font-bold text-amber-900">{b.format(mmVal)}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Benchmark: {b.benchmarkDisplay || b.format(b.benchmark)}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    status === 'above' ? 'text-green-700' : status === 'below' ? 'text-red-700' : 'text-yellow-700'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Competitors Page
// ---------------------------------------------------------------------------

export default function Competitors({ dateRange }) {
  // ----- state -----
  const [accounts, setAccounts] = useState(() => getData(KEYS.COMPETITORS + 'accounts') || [])
  const [history, setHistory] = useState(() => getData(KEYS.COMPETITORS + 'history') || {})
  const [, setTick] = useState(0) // force re-render after mutations

  const mmFollowers = useMemo(() => getData(KEYS.FOLLOWERS + 'daily') || [], [dateRange])

  const latestMM = useMemo(() => {
    if (mmFollowers.length === 0) return null
    return mmFollowers[mmFollowers.length - 1]
  }, [mmFollowers])

  // ----- CRUD callbacks -----
  const handleAdd = useCallback(
    (formData) => {
      const newId = 'comp-' + Date.now()
      const newAccount = {
        id: newId,
        name: formData.name,
        handle: formData.handle,
        platform: formData.platform,
        bio: '',
      }

      setAccounts((prev) => {
        const updated = [...prev, newAccount]
        saveData(KEYS.COMPETITORS + 'accounts', updated)
        return updated
      })

      // Seed a single history entry from form data so charts work immediately
      const today = new Date().toISOString().slice(0, 10)
      setHistory((prev) => {
        const newHistory = {
          ...prev,
          [newId]: [
            {
              date: today,
              followers: formData.followers,
              avgViews: formData.avgViews,
              engagementRate: formData.engagementRate,
              postsThisWeek: formData.postsPerWeek,
            },
          ],
        }
        saveData(KEYS.COMPETITORS + 'history', newHistory)
        return newHistory
      })
      setTick((t) => t + 1)
    },
    [],
  )

  const handleDelete = useCallback(
    (id) => {
      if (!window.confirm('Are you sure you want to delete this competitor?')) return

      setAccounts((prev) => {
        const updated = prev.filter((a) => a.id !== id)
        saveData(KEYS.COMPETITORS + 'accounts', updated)
        return updated
      })

      setHistory((prev) => {
        const newHistory = { ...prev }
        delete newHistory[id]
        saveData(KEYS.COMPETITORS + 'history', newHistory)
        return newHistory
      })
      setTick((t) => t + 1)
    },
    [],
  )

  // ----- render -----
  return (
    <div className="space-y-6">
      {/* SECTION 1: Competitor Entry Form */}
      <CompetitorForm accounts={accounts} onAdd={handleAdd} onDelete={handleDelete} />

      {/* SECTION 2: Rank Cards */}
      {accounts.length > 0 && latestMM && (
        <RankCards mmData={latestMM} competitors={accounts} history={history} mmReels={getData(KEYS.REELS + 'all') || []} />
      )}

      {/* SECTION 3: Comparison Charts */}
      {accounts.length > 0 && mmFollowers.length > 0 && (
        <ComparisonCharts
          mmFollowers={mmFollowers}
          competitors={accounts}
          history={history}
          dateRange={dateRange}
        />
      )}

      {/* SECTION 4: Gap Analysis Table */}
      {accounts.length > 0 && mmFollowers.length > 0 && (
        <GapAnalysis
          mmFollowers={mmFollowers}
          competitors={accounts}
          history={history}
          dateRange={dateRange}
        />
      )}

      {/* SECTION 5: Industry Benchmarks */}
      {latestMM && <IndustryBenchmarks mmFollowersLatest={latestMM} />}

      {/* Empty state when no competitors */}
      {accounts.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-400 text-sm">Add competitors above to see ranking, comparison charts, and gap analysis.</p>
        </Card>
      )}
    </div>
  )
}
