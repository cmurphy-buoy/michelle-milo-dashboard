import { useState, useMemo } from 'react'

const PLATFORM_BADGE = {
  instagram: { bg: 'bg-purple-100 text-purple-700', label: 'IG' },
  tiktok: { bg: 'bg-teal-100 text-teal-700', label: 'TT' },
  facebook: { bg: 'bg-blue-100 text-blue-700', label: 'FB' },
}

export default function ContentTable({ reels }) {
  const [sortCol, setSortCol] = useState('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)
  const perPage = 10

  const avgViews = useMemo(
    () => (reels.length ? reels.reduce((s, r) => s + r.views, 0) / reels.length : 0),
    [reels]
  )

  const sorted = useMemo(() => {
    const s = [...reels].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol]
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortAsc ? va - vb : vb - va
    })
    return s
  }, [reels, sortCol, sortAsc])

  const paged = sorted.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(sorted.length / perPage)

  const toggleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(false) }
    setPage(0)
  }

  const engRate = (r) => {
    const eng = r.likes + r.comments + r.shares + r.saves
    return r.reach ? ((eng / r.reach) * 100).toFixed(2) : '0.00'
  }

  const rowColor = (r) => {
    const e = parseFloat(engRate(r))
    if (e > 6) return 'bg-green-50'
    if (e >= 3) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'platform', label: 'Platform' },
    { key: 'title', label: 'Title' },
    { key: 'views', label: 'Views' },
    { key: 'likes', label: 'Likes' },
    { key: 'comments', label: 'Comments' },
    { key: 'shares', label: 'Shares' },
    { key: 'saves', label: 'Saves' },
    { key: 'engagement', label: 'Eng. Rate' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Content Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key === 'engagement' ? 'views' : c.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                >
                  {c.label} {sortCol === c.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map((r) => {
              const badge = PLATFORM_BADGE[r.platform] || { bg: 'bg-gray-100 text-gray-600', label: '?' }
              const isBreakout = r.views > avgViews * 2
              return (
                <tr key={r.id} className={rowColor(r)}>
                  <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg}`}>{badge.label}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    {isBreakout && <span className="mr-1" title="Breakout reel">🔥</span>}
                    {r.title}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.views.toLocaleString()}</td>
                  <td className="px-4 py-3">{r.likes.toLocaleString()}</td>
                  <td className="px-4 py-3">{r.comments.toLocaleString()}</td>
                  <td className="px-4 py-3">{r.shares.toLocaleString()}</td>
                  <td className="px-4 py-3">{r.saves.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{engRate(r)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Page {page + 1} of {totalPages} ({sorted.length} reels)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 rounded border disabled:opacity-30">Prev</button>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 rounded border disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
