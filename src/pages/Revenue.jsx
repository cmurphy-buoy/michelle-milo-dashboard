import { useState, useMemo } from 'react'
import { getData, saveData, KEYS } from '../utils/storage'
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEAL_TYPES = ['Sponsorship', 'Brand Deal', 'Ad Revenue', 'Bonus Program']
const PLATFORMS = ['instagram', 'tiktok', 'facebook']

const PLATFORM_COLORS = {
  instagram: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', chart: '#8b5cf6' },
  tiktok:    { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300',   chart: '#14b8a6' },
  facebook:  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300',   chart: '#3b82f6' },
}

const PIE_COLORS = ['#22c55e', '#eab308', '#f97316', '#06b6d4']

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  platform: 'instagram',
  reelId: '',
  amount: '',
  type: 'Sponsorship',
  brand: '',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n) {
  if (n == null || isNaN(n)) return '$0'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtCompact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function trendArrow(current, previous) {
  if (previous === 0 || previous == null) return { arrow: '--', color: 'text-gray-400', pct: 0 }
  const pct = ((current - previous) / previous) * 100
  if (pct > 0) return { arrow: '\u2191', color: 'text-green-500', pct: pct.toFixed(1) }
  if (pct < 0) return { arrow: '\u2193', color: 'text-red-500', pct: Math.abs(pct).toFixed(1) }
  return { arrow: '--', color: 'text-gray-400', pct: 0 }
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function previousMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Revenue({ dateRange }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [refreshKey, setRefreshKey] = useState(0)

  // ---- Load data (re-reads on refreshKey change) ----
  const deals = useMemo(() => getData(KEYS.REVENUE + 'deals') || [], [refreshKey])
  const monthly = useMemo(() => getData(KEYS.REVENUE + 'monthly') || [], [refreshKey])
  const reels = useMemo(() => getData(KEYS.REELS + 'all') || [], [refreshKey])
  const followers = useMemo(() => getData(KEYS.FOLLOWERS + 'daily') || [], [refreshKey])

  // ---- Derived data ----
  const curMonth = currentMonth()
  const prevMonth = previousMonth()

  const curMonthDeals = deals.filter((d) => d.date?.startsWith(curMonth))
  const prevMonthDeals = deals.filter((d) => d.date?.startsWith(prevMonth))

  const curMonthRevenue = curMonthDeals.reduce((s, d) => s + (d.amount || 0), 0)
  const prevMonthRevenue = prevMonthDeals.reduce((s, d) => s + (d.amount || 0), 0)

  const revenuePerPost = deals.length > 0 ? deals.reduce((s, d) => s + (d.amount || 0), 0) / deals.length : 0
  const prevRevenuePerPost = prevMonthDeals.length > 0 ? prevMonthRevenue / prevMonthDeals.length : 0

  // CPM: total revenue / total views of sponsored reels * 1000
  const reelsMap = useMemo(() => {
    const m = {}
    reels.forEach((r) => { m[r.id] = r })
    return m
  }, [reels])

  const sponsoredViews = deals.reduce((s, d) => {
    const reel = reelsMap[d.reelId]
    return s + (reel ? reel.views : 0)
  }, 0)
  const totalRevenue = deals.reduce((s, d) => s + (d.amount || 0), 0)
  const cpm = sponsoredViews > 0 ? (totalRevenue / sponsoredViews) * 1000 : 0

  const prevSponsoredViews = prevMonthDeals.reduce((s, d) => {
    const reel = reelsMap[d.reelId]
    return s + (reel ? reel.views : 0)
  }, 0)
  const prevCpm = prevSponsoredViews > 0 ? (prevMonthRevenue / prevSponsoredViews) * 1000 : 0

  // Estimated account value: followers * $0.05 + monthly revenue * 12
  const latestFollowers = followers.length > 0 ? followers[followers.length - 1].combined : 0
  const prevFollowers = followers.length > 1 ? followers[followers.length - 2].combined : 0
  const accountValue = latestFollowers * 0.05 + curMonthRevenue * 12
  const prevAccountValue = prevFollowers * 0.05 + prevMonthRevenue * 12

  // ---- KPI trend data ----
  const kpiCards = [
    {
      title: 'Monthly Revenue',
      value: fmt(curMonthRevenue),
      trend: trendArrow(curMonthRevenue, prevMonthRevenue),
      sub: 'vs last month',
    },
    {
      title: 'Revenue Per Post',
      value: fmt(Math.round(revenuePerPost)),
      trend: trendArrow(revenuePerPost, prevRevenuePerPost),
      sub: 'average per deal',
    },
    {
      title: 'CPM',
      value: fmt(Math.round(cpm * 100) / 100),
      trend: trendArrow(cpm, prevCpm),
      sub: 'cost per mille',
    },
    {
      title: 'Est. Account Value',
      value: fmt(Math.round(accountValue)),
      trend: trendArrow(accountValue, prevAccountValue),
      sub: 'industry estimate',
    },
  ]

  // ---- Chart data: Revenue by type (pie) ----
  const revenueByType = useMemo(() => {
    const map = {}
    DEAL_TYPES.forEach((t) => { map[t] = 0 })
    deals.forEach((d) => {
      const label = DEAL_TYPES.includes(d.type) ? d.type : 'Sponsorship'
      map[label] = (map[label] || 0) + (d.amount || 0)
    })
    return DEAL_TYPES.map((t) => ({ name: t, value: map[t] })).filter((e) => e.value > 0)
  }, [deals])

  // ---- Chart data: Scatter (views vs revenue) ----
  const scatterData = useMemo(() => {
    return deals.map((d) => {
      const reel = reelsMap[d.reelId]
      return {
        views: reel ? reel.views : 0,
        revenue: d.amount || 0,
        brand: d.brand,
      }
    }).filter((d) => d.views > 0)
  }, [deals, reelsMap])

  // ---- Chart data: monthly stacked bar ----
  const monthlyChartData = useMemo(() => {
    return monthly.map((m) => ({
      month: m.month,
      Instagram: m.instagram || 0,
      TikTok: m.tiktok || 0,
      Facebook: m.facebook || 0,
    }))
  }, [monthly])

  // ---- Sorted deals for table ----
  const sortedDeals = useMemo(() => {
    return [...deals].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [deals])

  const runningTotal = deals.reduce((s, d) => s + (d.amount || 0), 0)

  // ---- Form handlers ----
  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.brand.trim() || !form.amount) return

    const newDeal = {
      id: 'deal-' + Date.now(),
      brand: form.brand.trim(),
      date: form.date,
      platform: form.platform,
      amount: parseFloat(form.amount) || 0,
      type: form.type,
      reelId: form.reelId || null,
    }

    const existing = getData(KEYS.REVENUE + 'deals') || []
    existing.push(newDeal)
    saveData(KEYS.REVENUE + 'deals', existing)

    setForm({ ...EMPTY_FORM })
    setRefreshKey((k) => k + 1)
  }

  // ---- Custom tooltip for scatter ----
  function ScatterTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg">
        <p className="font-semibold">{d.brand}</p>
        <p>Views: {fmtCompact(d.views)}</p>
        <p>Revenue: {fmt(d.revenue)}</p>
      </div>
    )
  }

  // ---- Render ----
  return (
    <div className="space-y-6">

      {/* ---------- SECTION 1: Revenue Entry Form ---------- */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Add Revenue Entry</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
            <select
              name="platform"
              value={form.platform}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Reel */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reel</label>
            <select
              name="reelId"
              value={form.reelId}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              <option value="">-- Select reel --</option>
              {reels
                .filter((r) => r.platform === form.platform)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.date})
                  </option>
                ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount ($)</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              {DEAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Brand Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Brand Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="e.g. BarkBox"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                type="submit"
                className="shrink-0 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ---------- SECTION 2: KPI Cards ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.title}
            className="bg-white rounded-2xl border border-green-400 p-5 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-sm font-semibold ${kpi.trend.color}`}>
                {kpi.trend.arrow} {kpi.trend.pct}%
              </span>
              <span className="text-xs text-gray-400">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- SECTION 3: Charts ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly Revenue Stacked Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Monthly Revenue by Platform</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => '$' + fmtCompact(v)} />
              <Tooltip
                formatter={(v) => fmt(v)}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Instagram" stackId="a" fill={PLATFORM_COLORS.instagram.chart} radius={[0, 0, 0, 0]} />
              <Bar dataKey="TikTok" stackId="a" fill={PLATFORM_COLORS.tiktok.chart} />
              <Bar dataKey="Facebook" stackId="a" fill={PLATFORM_COLORS.facebook.chart} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Per Post Scatter */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue vs Views (per Deal)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="views"
                name="Views"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => fmtCompact(v)}
              />
              <YAxis
                dataKey="revenue"
                name="Revenue"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => '$' + fmtCompact(v)}
              />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter data={scatterData} fill="#eab308" strokeWidth={1} stroke="#ca8a04">
                {scatterData.map((_, i) => (
                  <Cell key={i} fill="#eab308" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Type Pie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue by Type</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={revenueByType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                style={{ fontSize: 10 }}
              >
                {revenueByType.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---------- SECTION 4: Revenue Table ---------- */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">All Deals</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Brand</th>
                <th className="px-6 py-3">Platform</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Reel</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedDeals.map((deal) => {
                const reel = reelsMap[deal.reelId]
                const pc = PLATFORM_COLORS[deal.platform] || PLATFORM_COLORS.instagram
                return (
                  <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{deal.date}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{deal.brand}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${pc.bg} ${pc.text} ${pc.border} border`}>
                        {deal.platform.charAt(0).toUpperCase() + deal.platform.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{deal.type}</td>
                    <td className="px-6 py-3 text-gray-600 truncate max-w-[180px]">
                      {reel ? reel.title : deal.reelId || '--'}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-green-600">{fmt(deal.amount)}</td>
                  </tr>
                )
              })}

              {/* Running total row */}
              <tr className="bg-green-50 font-bold">
                <td className="px-6 py-3" colSpan={5}>
                  <span className="text-gray-700">Total ({sortedDeals.length} deals)</span>
                </td>
                <td className="px-6 py-3 text-right text-green-700 text-base">{fmt(runningTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
