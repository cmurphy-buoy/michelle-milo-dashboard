import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function FollowerChart({ followers }) {
  if (!followers.length) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Follower Growth</h3>
        <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No follower data available</div>
      </div>
    )
  }

  const chartData = followers.map((d) => ({
    date: (d.date || '').slice(5), // MM-DD
    Instagram: d.instagram || 0,
    TikTok: d.tiktok || 0,
    Facebook: d.facebook || 0,
  }))

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Follower Growth</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
          <Tooltip formatter={(v) => (v ?? 0).toLocaleString()} />
          <Legend />
          <Line type="monotone" dataKey="Instagram" stroke="#C13584" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="TikTok" stroke="#00C9B1" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Facebook" stroke="#1877F2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
