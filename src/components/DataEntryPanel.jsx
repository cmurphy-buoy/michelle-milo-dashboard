import { useState, useRef } from 'react'
import { getData, saveData, KEYS } from '../utils/storage'

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PLATFORMS = ['instagram', 'tiktok', 'facebook', 'linkedin']
const CATEGORIES = ['tricks', 'day-in-life', 'funny', 'grooming', 'travel']

function ReelForm({ onDone }) {
  const [form, setForm] = useState({
    platform: 'instagram', date: localDateStr(), title: '',
    views: '', likes: '', comments: '', shares: '', saves: '', reach: '',
    watchTimePct: '', nonFollowerReachPct: '', category: 'funny', audioType: 'original',
  })

  const handleSubmit = () => {
    if (!form.title || !form.views) return
    const reel = {
      id: `reel-${Date.now()}`,
      title: form.title,
      platform: form.platform,
      category: form.category,
      date: form.date,
      views: Number(form.views) || 0,
      likes: Number(form.likes) || 0,
      comments: Number(form.comments) || 0,
      shares: Number(form.shares) || 0,
      saves: Number(form.saves) || 0,
      reach: Number(form.reach) || 0,
      replays: 0,
      watchTimePct: Number(form.watchTimePct) || 50,
      hookRetention: 65,
      nonFollowerReachPct: Number(form.nonFollowerReachPct) || 40,
      isBreakout: false,
    }
    const existing = getData(KEYS.REELS + 'all') || []
    saveData(KEYS.REELS + 'all', [...existing, reel])
    onDone('Reel added successfully!')
  }

  const fields = [
    { key: 'title', label: 'Reel Title', type: 'text' },
    { key: 'platform', label: 'Platform', type: 'select', options: PLATFORMS },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'category', label: 'Category', type: 'select', options: CATEGORIES },
    { key: 'audioType', label: 'Audio Type', type: 'select', options: ['original', 'trending'] },
    { key: 'views', label: 'Views', type: 'number' },
    { key: 'likes', label: 'Likes', type: 'number' },
    { key: 'comments', label: 'Comments', type: 'number' },
    { key: 'shares', label: 'Shares', type: 'number' },
    { key: 'saves', label: 'Saves', type: 'number' },
    { key: 'reach', label: 'Reach', type: 'number' },
    { key: 'watchTimePct', label: 'Watch Time %', type: 'number' },
    { key: 'nonFollowerReachPct', label: 'Non-Follower Reach %', type: 'number' },
  ]

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <label key={f.key} className="block">
          <span className="text-xs text-gray-500">{f.label}</span>
          {f.type === 'select' ? (
            <select value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input type={f.type} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          )}
        </label>
      ))}
      <button onClick={handleSubmit} className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">Add Reel</button>
    </div>
  )
}

function FollowerForm({ onDone }) {
  const [form, setForm] = useState({ platform: 'instagram', date: localDateStr(), count: '' })

  const handleSubmit = () => {
    if (!form.count) return
    const followers = getData(KEYS.FOLLOWERS + 'daily') || []
    const existing = followers.find((f) => f.date === form.date)
    if (existing) {
      existing[form.platform] = Number(form.count)
      existing.combined = (existing.instagram || 0) + (existing.tiktok || 0) + (existing.facebook || 0) + (existing.linkedin || 0)
    } else {
      const last = followers[followers.length - 1] || { instagram: 0, tiktok: 0, facebook: 0, linkedin: 0 }
      const entry = { date: form.date, instagram: last.instagram, tiktok: last.tiktok, facebook: last.facebook, linkedin: last.linkedin || 0 }
      entry[form.platform] = Number(form.count)
      entry.combined = entry.instagram + entry.tiktok + entry.facebook + (entry.linkedin || 0)
      followers.push(entry)
    }
    followers.sort((a, b) => a.date.localeCompare(b.date))
    saveData(KEYS.FOLLOWERS + 'daily', followers)
    onDone('Follower count updated!')
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs text-gray-500">Platform</span>
        <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">Date</span>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">Follower Count</span>
        <input type="number" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
      </label>
      <button onClick={handleSubmit} className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">Update Followers</button>
    </div>
  )
}

function CsvImport({ onDone }) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const requiredCols = ['platform', 'date', 'title', 'views', 'likes', 'comments', 'shares', 'saves', 'reach']

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.replace(/\r/g, '').split('\n').map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
      if (lines.length < 2) return
      const hdrs = lines[0]
      const dataRows = lines.slice(1).filter((r) => r.length === hdrs.length && r.some((c) => c))
      setHeaders(hdrs)
      setRows(dataRows)
      setPreview(dataRows.slice(0, 5))
      // Auto-map matching column names
      const autoMap = {}
      requiredCols.forEach((col) => {
        const idx = hdrs.findIndex((h) => h.toLowerCase() === col)
        if (idx >= 0) autoMap[col] = idx
      })
      setMapping(autoMap)
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    const requiredMapped = ['title', 'views', 'date'].filter((col) => mapping[col] === undefined || mapping[col] === '')
    if (requiredMapped.length > 0) {
      onDone(`Please map required columns: ${requiredMapped.join(', ')}`)
      return
    }
    let success = 0, errors = 0
    const existing = getData(KEYS.REELS + 'all') || []
    rows.forEach((row) => {
      try {
        const reel = {
          id: `reel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          platform: (row[mapping.platform] || 'instagram').toLowerCase(),
          date: row[mapping.date] || localDateStr(),
          title: row[mapping.title] || 'Imported Reel',
          views: Number(row[mapping.views]) || 0,
          likes: Number(row[mapping.likes]) || 0,
          comments: Number(row[mapping.comments]) || 0,
          shares: Number(row[mapping.shares]) || 0,
          saves: Number(row[mapping.saves]) || 0,
          reach: Number(row[mapping.reach]) || 0,
          category: 'day-in-life', replays: 0, watchTimePct: 50, hookRetention: 60, nonFollowerReachPct: 40, isBreakout: false,
        }
        existing.push(reel)
        success++
      } catch { errors++ }
    })
    saveData(KEYS.REELS + 'all', existing)
    onDone(`Imported ${success} reels. ${errors ? errors + ' errors.' : ''}`)
    setPreview(null); setRows([]); setHeaders([])
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
          Choose CSV File
        </button>
        <p className="text-xs text-gray-400 mt-2">Upload a .csv with reel metrics</p>
      </div>

      {preview && (
        <>
          <div className="text-xs text-gray-600 font-medium">Preview (first {preview.length} rows):</div>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead><tr>{headers.map((h, i) => <th key={i} className="px-2 py-1 text-left bg-gray-50">{h}</th>)}</tr></thead>
              <tbody>{preview.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className="px-2 py-1 border-t">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Map columns:</p>
            {requiredCols.map((col) => (
              <div key={col} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-24 capitalize">{col}</span>
                <select value={mapping[col] ?? ''} onChange={(e) => setMapping({ ...mapping, [col]: e.target.value === '' ? undefined : Number(e.target.value) })} className="flex-1 px-2 py-1 border rounded text-xs">
                  <option value="">-- Select --</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button onClick={handleImport} className="w-full py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors">
            Import {rows.length} Rows
          </button>
        </>
      )}
    </div>
  )
}

export default function DataEntryPanel({ onClose, onDataChange }) {
  const [tab, setTab] = useState('reel')
  const [toast, setToast] = useState('')

  const handleDone = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
    onDataChange?.()
  }

  const tabs = [
    { id: 'reel', label: 'New Reel' },
    { id: 'followers', label: 'Followers' },
    { id: 'csv', label: 'CSV Import' },
  ]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Add Data</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b px-5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'reel' && <ReelForm onDone={handleDone} />}
          {tab === 'followers' && <FollowerForm onDone={handleDone} />}
          {tab === 'csv' && <CsvImport onDone={handleDone} />}
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg text-sm font-medium animate-fade-in">
            {toast}
          </div>
        )}
      </div>
    </>
  )
}
