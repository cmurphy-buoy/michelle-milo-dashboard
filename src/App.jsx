import { useState, useEffect, useCallback } from 'react'
import { loadDemoData, getAllKeys } from './utils/storage'
import DataEntryPanel from './components/DataEntryPanel'
import Overview from './pages/Overview'
import Instagram from './pages/Instagram'
import TikTok from './pages/TikTok'
import Facebook from './pages/Facebook'
import LinkedIn from './pages/LinkedIn'
import Competitors from './pages/Competitors'
import Revenue from './pages/Revenue'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'facebook', label: 'Facebook', icon: '👥' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'competitors', label: 'Competitors', icon: '🏆' },
  { id: 'revenue', label: 'Revenue', icon: '💰' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

const DATE_RANGES = [
  { value: 7, label: 'Last 7 Days' },
  { value: 30, label: 'Last 30 Days' },
  { value: 90, label: 'Last 90 Days' },
  { value: 0, label: 'All Time' },
]

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState(30)
  const [hasData, setHasData] = useState(false)
  const [showDataEntry, setShowDataEntry] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDataChange = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const [toast, setToast] = useState(null)

  useEffect(() => {
    setHasData(getAllKeys().length > 0)

    // Handle OAuth redirect
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    if (connected) {
      setToast({ type: 'success', message: `${connected === 'meta' ? 'Instagram & Facebook' : 'TikTok'} connected successfully!` })
      setActiveTab('settings')
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => setToast(null), 4000)
    } else if (error) {
      setToast({ type: 'error', message: `Connection failed: ${error}` })
      setActiveTab('settings')
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => setToast(null), 4000)
    }
  }, [])

  const handleLoadDemo = () => {
    loadDemoData()
    setHasData(true)
  }

  const renderPage = () => {
    // Settings is always accessible, even without data (needed for initial account setup)
    if (activeTab === 'settings') return <Settings />

    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="text-6xl">⚓</div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome to Buoy Marketing Dashboard</h2>
          <p className="text-gray-500 max-w-md text-center">
            No data yet. Load demo data to explore the dashboard, or connect your real accounts via Settings.
          </p>
          <div className="flex gap-3">
          <button
            onClick={handleLoadDemo}
            className="px-6 py-3 bg-[#0f1b4c] text-white rounded-xl hover:bg-[#1a2d6d] transition-colors font-semibold shadow-md hover:shadow-lg"
          >
            Load Demo Data
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-6 py-3 bg-white text-[#0f1b4c] border-2 border-[#0f1b4c]/30 rounded-xl hover:bg-blue-50 transition-colors font-semibold shadow-md"
          >
            Connect Accounts
          </button>
          </div>
        </div>
      )
    }

    const props = { dateRange, key: refreshKey }
    switch (activeTab) {
      case 'overview': return <Overview {...props} />
      case 'instagram': return <Instagram {...props} />
      case 'tiktok': return <TikTok {...props} />
      case 'facebook': return <Facebook {...props} />
      case 'linkedin': return <LinkedIn {...props} />
      case 'competitors': return <Competitors {...props} />
      case 'revenue': return <Revenue {...props} />
      case 'calendar': return <Calendar {...props} />
      case 'settings': return <Settings />
      default: return <Overview {...props} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚓</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Buoy Marketing</h1>
              <p className="text-xs text-gray-500">Social Media Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasData && (
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f1b4c]/30"
              >
                {DATE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation — always show Settings tab, others only when data exists */}
      {(hasData || activeTab === 'settings') && (
        <nav className="bg-white border-b border-slate-200 sticky top-[73px] z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-hide -mb-px">
              {TABS.filter((tab) => hasData || tab.id === 'settings').map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#0f1b4c] text-[#0f1b4c]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderPage()}
      </main>

      {/* Floating + Button */}
      {hasData && (
        <button
          onClick={() => setShowDataEntry(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#0f1b4c] text-white rounded-full shadow-lg hover:bg-[#1a2d6d] hover:shadow-xl transition-all text-2xl font-bold z-40 flex items-center justify-center"
          title="Add data"
        >
          +
        </button>
      )}

      {/* Data Entry Panel */}
      {showDataEntry && (
        <DataEntryPanel onClose={() => setShowDataEntry(false)} onDataChange={handleDataChange} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg text-sm font-medium z-50 animate-fade-in ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
