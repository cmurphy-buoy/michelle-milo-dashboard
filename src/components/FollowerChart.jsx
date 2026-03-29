import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function FollowerChart({ followers }) {
  const chartData = followers.map((d) => ({
    date: d.date.slice(5), // MM-DD
    Instagram: d.instagram,
    TikTok: d.tiktok,
    Facebook: d.facebook,
  }))

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Follower Growth</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'K'} />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Legend />
          <Line type="monotone" dataKey="Instagram" stroke="#C13584" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="TikTok" stroke="#00C9B1" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Facebook" stroke="#1877F2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
