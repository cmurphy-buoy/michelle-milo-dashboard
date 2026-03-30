import { useMemo } from 'react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function PostingHeatmap({ reels }) {
  const grid = useMemo(() => {
    // Build a 5-week × 7-day grid of post counts (handles months with 5 weeks)
    const numWeeks = 5
    const weeks = Array.from({ length: numWeeks }, () => Array(7).fill(0))
    const now = new Date()

    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

    reels.forEach((r) => {
      const rd = new Date(r.date)
      const isCurrentMonth = rd.getMonth() === now.getMonth() && rd.getFullYear() === now.getFullYear()
      const isPrevMonth = rd.getMonth() === prevMonth && rd.getFullYear() === prevMonthYear
      if (!isCurrentMonth && !isPrevMonth) return
      const dayOfMonth = rd.getDate()
      const weekIdx = Math.min(numWeeks - 1, Math.floor((dayOfMonth - 1) / 7))
      const dayIdx = (rd.getDay() + 6) % 7 // Monday=0
      weeks[weekIdx][dayIdx]++
    })

    return weeks
  }, [reels])

  const maxPosts = Math.max(1, ...grid.flat())

  const intensity = (count) => {
    if (count === 0) return 'bg-gray-100'
    const pct = count / maxPosts
    if (pct < 0.33) return 'bg-orange-200'
    if (pct < 0.66) return 'bg-orange-400'
    return 'bg-orange-600'
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Posting Schedule</h3>
      <div className="space-y-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium">{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((count, di) => (
              <div
                key={di}
                className={`aspect-square rounded-md ${intensity(count)} flex items-center justify-center text-xs font-medium ${count > 0 ? 'text-white' : 'text-gray-300'}`}
                title={`Week ${wi + 1}, ${DAYS[di]}: ${count} posts`}
              >
                {count > 0 ? count : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
        <span>Less</span>
        <div className="w-4 h-4 rounded bg-gray-100"></div>
        <div className="w-4 h-4 rounded bg-orange-200"></div>
        <div className="w-4 h-4 rounded bg-orange-400"></div>
        <div className="w-4 h-4 rounded bg-orange-600"></div>
        <span>More</span>
      </div>
    </div>
  )
}
