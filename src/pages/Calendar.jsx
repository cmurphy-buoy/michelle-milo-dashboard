import { useState, useMemo } from 'react'
import { getData, saveData, KEYS } from '../utils/storage'

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PLATFORMS = ['instagram', 'tiktok', 'facebook']
const CATEGORIES = ['tricks', 'day-in-life', 'funny', 'grooming', 'travel']
const STATUSES = ['idea', 'filming', 'editing', 'ready', 'posted']
const STATUS_COLORS = {
  idea: 'bg-gray-200 text-gray-700',
  filming: 'bg-yellow-200 text-yellow-800',
  editing: 'bg-blue-200 text-blue-800',
  ready: 'bg-green-200 text-green-800',
  posted: 'bg-purple-200 text-purple-800',
}
const PLATFORM_COLORS = {
  instagram: 'border-l-purple-500 bg-purple-50',
  tiktok: 'border-l-teal-500 bg-teal-50',
  facebook: 'border-l-blue-500 bg-blue-50',
}
const URGENCY_COLORS = { '24h': 'bg-red-100 text-red-700', '3d': 'bg-orange-100 text-orange-700', '1w': 'bg-green-100 text-green-700' }
const PRIORITY_COLORS = { hot: 'bg-red-100 text-red-700', warm: 'bg-orange-100 text-orange-700', backlog: 'bg-gray-100 text-gray-600' }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function CalendarGrid({ posts, currentDate, onSelectPost }) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const getPostsForDay = (day) => {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return posts.filter((p) => p.date === dateStr)
  }

  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
      {DAYS.map((d) => (
        <div key={d} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
      ))}
      {cells.map((day, i) => {
        const dayPosts = getPostsForDay(day)
        const isToday = day && new Date().getDate() === day && new Date().getMonth() === month
        return (
          <div key={i} className={`bg-white min-h-[100px] p-1.5 ${!day ? 'bg-gray-50' : ''}`}>
            {day && (
              <>
                <span className={`text-xs font-medium ${isToday ? 'bg-orange-500 text-white px-1.5 py-0.5 rounded-full' : 'text-gray-500'}`}>
                  {day}
                </span>
                <div className="mt-1 space-y-1">
                  {dayPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => onSelectPost(post)}
                      className={`w-full text-left px-1.5 py-1 rounded text-[10px] border-l-2 truncate ${PLATFORM_COLORS[post.platforms?.[0]] || 'border-l-gray-300 bg-gray-50'}`}
                    >
                      <span className={`inline-block px-1 rounded text-[9px] ${STATUS_COLORS[post.status]}`}>{post.status}</span>
                      <span className="ml-1 text-gray-600">{post.category}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PostModal({ post, onSave, onClose }) {
  const [form, setForm] = useState(
    post || { id: '', date: localDateStr(), time: '12:00', platforms: ['instagram'], category: 'funny', caption: '', hashtags: '', audioRef: '', status: 'idea' }
  )

  const handleSave = () => {
    const data = { ...form, id: form.id || `cal-${Date.now()}`, hashtags: typeof form.hashtags === 'string' ? form.hashtags.split(',').map((h) => h.trim()).filter(Boolean) : form.hashtags }
    onSave(data)
  }

  const togglePlatform = (p) => {
    const platforms = form.platforms || []
    setForm({ ...form, platforms: platforms.includes(p) ? platforms.filter((x) => x !== p) : [...platforms, p] })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">{post ? 'Edit Post' : 'Add Post'}</h3>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">Date</span>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Time</span>
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </label>
        </div>

        <div>
          <span className="text-xs text-gray-500">Platforms</span>
          <div className="flex gap-2 mt-1">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => togglePlatform(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${(form.platforms || []).includes(p) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Status</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-gray-500">Caption Draft</span>
          <textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Hashtags (comma separated)</span>
          <input type="text" value={Array.isArray(form.hashtags) ? form.hashtags.join(', ') : form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Audio / Trend Reference</span>
          <input type="text" value={form.audioRef || ''} onChange={(e) => setForm({ ...form, audioRef: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </label>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">Save</button>
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function CadenceTracker({ posts }) {
  const targets = { instagram: 5, tiktok: 4, facebook: 3 }

  const thisWeek = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const counts = { instagram: 0, tiktok: 0, facebook: 0 }
    posts.filter((p) => p.status === 'posted' && new Date(p.date) >= weekAgo).forEach((p) => {
      (p.platforms || []).forEach((pl) => { if (counts[pl] !== undefined) counts[pl]++ })
    })
    return counts
  }, [posts])

  const lastPostDate = useMemo(() => {
    const byPlatform = {}
    posts.filter((p) => p.status === 'posted').forEach((p) => {
      (p.platforms || []).forEach((pl) => {
        if (!byPlatform[pl] || p.date > byPlatform[pl]) byPlatform[pl] = p.date
      })
    })
    return byPlatform
  }, [posts])

  const daysSince = (dateStr) => {
    if (!dateStr) return 999
    return Math.floor((new Date() - new Date(dateStr)) / 86400000)
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Posting Cadence (This Week)</h3>
      <div className="space-y-3">
        {PLATFORMS.map((p) => {
          const actual = thisWeek[p]
          const target = targets[p]
          const pct = Math.min(100, (actual / target) * 100)
          const stale = daysSince(lastPostDate[p]) >= 3
          return (
            <div key={p}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize font-medium text-gray-600">{p} {stale && <span className="text-red-500 font-bold ml-1">3+ days ago!</span>}</span>
                <span className="text-gray-400">{actual}/{target}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Sidebar({ onMoveToCalendar }) {
  const [openSection, setOpenSection] = useState('ideas')
  const [ideas, setIdeas] = useState(() => getData(KEYS.IDEAS + 'bank') || [])
  const [trends, setTrends] = useState(() => getData(KEYS.TRENDS + 'log') || [])
  const [hashtags, setHashtags] = useState(() => getData(KEYS.HASHTAGS + 'sets') || [])
  const [templates, setTemplates] = useState(() => getData(KEYS.TEMPLATES + 'captions') || [])
  const [newIdea, setNewIdea] = useState({ title: '', category: 'funny', platform: 'instagram', priority: 'warm' })
  const [newTrend, setNewTrend] = useState({ name: '', urgency: '3d', platform: 'tiktok' })
  const [newHashtagSet, setNewHashtagSet] = useState({ name: '', tags: '' })
  const [newTemplate, setNewTemplate] = useState({ name: '', template: '' })

  const toggle = (section) => setOpenSection(openSection === section ? null : section)

  // Ideas
  const addIdea = () => {
    if (!newIdea.title) return
    const idea = { ...newIdea, id: `idea-${Date.now()}`, notes: '', createdAt: localDateStr() }
    const updated = [...ideas, idea]
    setIdeas(updated)
    saveData(KEYS.IDEAS + 'bank', updated)
    setNewIdea({ title: '', category: 'funny', platform: 'instagram', priority: 'warm' })
  }

  const deleteIdea = (id) => {
    const updated = ideas.filter((i) => i.id !== id)
    setIdeas(updated)
    saveData(KEYS.IDEAS + 'bank', updated)
  }

  // Trends
  const addTrend = () => {
    if (!newTrend.name) return
    const trend = { ...newTrend, id: `trend-${Date.now()}`, used: false, linkedPostId: null, addedAt: localDateStr() }
    const updated = [...trends, trend]
    setTrends(updated)
    saveData(KEYS.TRENDS + 'log', updated)
    setNewTrend({ name: '', urgency: '3d', platform: 'tiktok' })
  }

  // Hashtags
  const addHashtagSet = () => {
    if (!newHashtagSet.name || !newHashtagSet.tags) return
    const set = { id: `hs-${Date.now()}`, name: newHashtagSet.name, tags: newHashtagSet.tags.split(',').map((t) => t.trim()).filter(Boolean) }
    const updated = [...hashtags, set]
    setHashtags(updated)
    saveData(KEYS.HASHTAGS + 'sets', updated)
    setNewHashtagSet({ name: '', tags: '' })
  }

  // Templates
  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.template) return
    const tpl = { id: `tpl-${Date.now()}`, ...newTemplate }
    const updated = [...templates, tpl]
    setTemplates(updated)
    saveData(KEYS.TEMPLATES + 'captions', updated)
    setNewTemplate({ name: '', template: '' })
  }

  const copy = (text) => navigator.clipboard.writeText(text)

  const sections = [
    {
      id: 'ideas', label: 'Content Ideas Bank', icon: '💡',
      content: (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input placeholder="Idea title..." value={newIdea.title} onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" />
            <select value={newIdea.priority} onChange={(e) => setNewIdea({ ...newIdea, priority: e.target.value })} className="px-2 py-1.5 border rounded text-xs">
              <option value="hot">Hot</option><option value="warm">Warm</option><option value="backlog">Backlog</option>
            </select>
            <button onClick={addIdea} className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs font-medium">+</button>
          </div>
          {['hot', 'warm', 'backlog'].map((priority) => {
            const filtered = ideas.filter((i) => i.priority === priority)
            if (!filtered.length) return null
            return (
              <div key={priority}>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-1 ${PRIORITY_COLORS[priority]}`}>{priority}</span>
                {filtered.map((idea) => (
                  <div key={idea.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 text-xs">
                    <span className="text-gray-700 truncate flex-1">{idea.title}</span>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => onMoveToCalendar(idea)} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px]" title="Move to calendar">📅</button>
                      <button onClick={() => deleteIdea(idea.id)} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ),
    },
    {
      id: 'trends', label: 'Trend & Audio Tracker', icon: '🎵',
      content: (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input placeholder="Trend name..." value={newTrend.name} onChange={(e) => setNewTrend({ ...newTrend, name: e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" />
            <select value={newTrend.urgency} onChange={(e) => setNewTrend({ ...newTrend, urgency: e.target.value })} className="px-2 py-1.5 border rounded text-xs">
              <option value="24h">24h</option><option value="3d">3 days</option><option value="1w">1 week</option>
            </select>
            <button onClick={addTrend} className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs font-medium">+</button>
          </div>
          {[...trends].sort((a, b) => { const order = { '24h': 0, '3d': 1, '1w': 2 }; return order[a.urgency] - order[b.urgency] }).map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 text-xs">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${URGENCY_COLORS[t.urgency]}`}>{t.urgency}</span>
              <span className="text-gray-700 truncate flex-1">{t.name}</span>
              {t.used && <span className="text-green-500 text-[10px]">Used</span>}
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'captions', label: 'Caption & Hashtag Library', icon: '#️⃣',
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Hashtag Sets</p>
            <div className="flex gap-2 mb-2">
              <input placeholder="Set name" value={newHashtagSet.name} onChange={(e) => setNewHashtagSet({ ...newHashtagSet, name: e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" />
              <button onClick={addHashtagSet} className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs font-medium">+</button>
            </div>
            {newHashtagSet.name && (
              <input placeholder="#tag1, #tag2, ..." value={newHashtagSet.tags} onChange={(e) => setNewHashtagSet({ ...newHashtagSet, tags: e.target.value })} className="w-full px-2 py-1.5 border rounded text-xs mb-2" />
            )}
            {hashtags.map((hs) => (
              <div key={hs.id} className="py-1.5 border-b border-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">{hs.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">{hs.tags.length} tags</span>
                    {hs.tags.length > 30 && <span className="text-[10px] text-red-500 font-bold">⚠ &gt;30</span>}
                    <button onClick={() => copy(hs.tags.join(' '))} className="px-2 py-0.5 bg-gray-100 rounded text-[10px]">Copy</button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{hs.tags.join(' ')}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Caption Templates</p>
            <div className="flex gap-2 mb-2">
              <input placeholder="Template name" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} className="flex-1 px-2 py-1.5 border rounded text-xs" />
              <button onClick={addTemplate} className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs font-medium">+</button>
            </div>
            {newTemplate.name && (
              <textarea placeholder="Caption text..." value={newTemplate.template} onChange={(e) => setNewTemplate({ ...newTemplate, template: e.target.value })} rows={2} className="w-full px-2 py-1.5 border rounded text-xs mb-2" />
            )}
            {templates.map((tpl) => (
              <div key={tpl.id} className="py-1.5 border-b border-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">{tpl.name}</span>
                  <button onClick={() => copy(tpl.template)} className="px-2 py-0.5 bg-gray-100 rounded text-[10px]">Copy</button>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{tpl.template}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <div key={s.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button onClick={() => toggle(s.id)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <span>{s.icon} {s.label}</span>
            <span className="text-gray-400">{openSection === s.id ? '▼' : '▶'}</span>
          </button>
          {openSection === s.id && <div className="px-4 pb-4">{s.content}</div>}
        </div>
      ))}
    </div>
  )
}

export default function Calendar() {
  const [view, setView] = useState('month')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [posts, setPosts] = useState(() => getData(KEYS.CALENDAR + 'posts') || [])
  const [modalPost, setModalPost] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const filteredPosts = useMemo(() => {
    if (platformFilter === 'all') return posts
    return posts.filter((p) => (p.platforms || []).includes(platformFilter))
  }, [posts, platformFilter])

  const handleSavePost = (post) => {
    const idx = posts.findIndex((p) => p.id === post.id)
    let updated
    if (idx >= 0) {
      updated = [...posts]
      updated[idx] = post
    } else {
      updated = [...posts, post]
    }
    setPosts(updated)
    saveData(KEYS.CALENDAR + 'posts', updated)
    setShowModal(false)
    setModalPost(null)
  }

  const handleSelectPost = (post) => {
    setModalPost(post)
    setShowModal(true)
  }

  const handleMoveToCalendar = (idea) => {
    setModalPost({ id: '', date: localDateStr(), time: '12:00', platforms: [idea.platform || 'instagram'], category: idea.category || 'funny', caption: idea.title, hashtags: '', audioRef: '', status: 'idea' })
    setShowModal(true)
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Cadence data
  const weekTarget = { instagram: 5, tiktok: 4, facebook: 3 }
  const planned = filteredPosts.filter((p) => p.status !== 'posted').length
  const posted = filteredPosts.filter((p) => p.status === 'posted').length

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['month', 'week', 'list'].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {v === 'month' ? 'Monthly' : v === 'week' ? 'Weekly' : 'List'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {['all', ...PLATFORMS].map((p) => (
            <button key={p} onClick={() => setPlatformFilter(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${platformFilter === p ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="px-3 py-1.5 bg-white text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 lg:hidden">
            {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          </button>
          <button onClick={() => { setModalPost(null); setShowModal(true) }} className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors">
            + Add Post
          </button>
        </div>
      </div>

      {/* Week at a glance bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{posted}</span> posted · <span className="font-semibold text-gray-700">{planned}</span> planned (this week)
        </div>
        <div className="flex items-center gap-4">
          {PLATFORMS.map((p) => {
            const now = new Date()
            const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
            const count = filteredPosts.filter((post) => post.status === 'posted' && (post.platforms || []).includes(p) && new Date(post.date) >= weekAgo).length
            return (
              <span key={p} className="text-xs text-gray-500">
                <span className="capitalize font-medium">{p}</span>: {count}/{weekTarget[p]}
              </span>
            )
          })}
        </div>
      </div>

      <div className={`grid gap-6 ${sidebarOpen ? 'lg:grid-cols-[1fr_300px]' : 'grid-cols-1'}`}>
        {/* Main calendar area */}
        <div>
          {view === 'month' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="px-3 py-1 bg-white rounded-lg text-sm hover:bg-gray-50">←</button>
                <h3 className="text-lg font-bold text-gray-800">{monthName}</h3>
                <button onClick={nextMonth} className="px-3 py-1 bg-white rounded-lg text-sm hover:bg-gray-50">→</button>
              </div>
              <CalendarGrid posts={filteredPosts} currentDate={currentDate} onSelectPost={handleSelectPost} />
            </>
          )}

          {view === 'list' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {[...filteredPosts].sort((a, b) => a.date.localeCompare(b.date)).map((p) => (
                  <button key={p.id} onClick={() => handleSelectPost(p)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                    <span className="text-xs text-gray-400 w-20">{p.date}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                    {(p.platforms || []).map((pl) => (
                      <span key={pl} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">{pl.slice(0, 2).toUpperCase()}</span>
                    ))}
                    <span className="text-sm text-gray-700 truncate flex-1">{p.caption || p.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500">Weekly view — showing posts for the current week</p>
              <div className="grid grid-cols-7 gap-2 mt-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => {
                  const d = new Date()
                  const startOfWeek = new Date(d)
                  startOfWeek.setDate(d.getDate() - ((d.getDay() + 6) % 7) + di)
                  const dateStr = startOfWeek.toISOString().slice(0, 10)
                  const dayPosts = filteredPosts.filter((p) => p.date === dateStr)
                  return (
                    <div key={day} className="min-h-[120px] border rounded-lg p-2">
                      <p className="text-xs font-semibold text-gray-500 mb-2">{day} {startOfWeek.getDate()}</p>
                      {dayPosts.map((p) => (
                        <button key={p.id} onClick={() => handleSelectPost(p)} className={`w-full text-left px-2 py-1 rounded text-[10px] mb-1 border-l-2 ${PLATFORM_COLORS[p.platforms?.[0]] || 'border-l-gray-300'}`}>
                          <span className={`inline-block px-1 rounded text-[9px] ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cadence tracker below calendar */}
          <div className="mt-6">
            <CadenceTracker posts={posts} />
          </div>
        </div>

        {/* Right sidebar */}
        {sidebarOpen && (
          <div className="hidden lg:block">
            <Sidebar onMoveToCalendar={handleMoveToCalendar} />
          </div>
        )}
      </div>

      {/* Mobile sidebar toggle content */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <Sidebar onMoveToCalendar={handleMoveToCalendar} />
        </div>
      )}

      {/* Post Modal */}
      {showModal && (
        <PostModal post={modalPost} onSave={handleSavePost} onClose={() => { setShowModal(false); setModalPost(null) }} />
      )}
    </div>
  )
}
