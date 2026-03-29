import { useState, useEffect, useCallback } from 'react'
import { loadDemoData, getAllKeys } from './utils/storage'
import DataEntryPanel from './components/DataEntryPanel'
import Overview from './pages/Overview'
import Instagram from './pages/Instagram'
import TikTok from './pages/TikTok'
import Facebook from './pages/Facebook'
import Competitors from './pages/Competitors'
import Revenue from './pages/Revenue'
import Calendar from './pages/Calendar'

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'facebook', label: 'Facebook', icon: '👥' },
  { id: 'competitors', label: 'Competitors', icon: '🏆' },
  { id: 'revenue', label: 'Revenue', icon: '💰' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
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

  useEffect(() => {
    setHasData(getAllKeys().length > 0)
  }, [])

  const handleLoadDemo = () => {
    loadDemoData()
    setHasData(true)
  }

  const renderPage = () => {
    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="text-6xl">🐾</div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome to Michelle & Milo Dashboard</h2>
          <p className="text-gray-500 max-w-md text-center">
            No data yet. Load demo data to explore the dashboard, or add your own metrics using the data entry form.
          </p>
          <button
            onClick={handleLoadDemo}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-semibold shadow-md hover:shadow-lg"
          >
            Load Demo Data
          </button>
        </div>
      )
    }

    const props = { dateRange, key: refreshKey }
    switch (activeTab) {
      case 'overview': return <Overview {...props} />
      case 'instagram': return <Instagram {...props} />
      case 'tiktok': return <TikTok {...props} />
      case 'facebook': return <Facebook {...props} />
      case 'competitors': return <Competitors {...props} />
      case 'revenue': return <Revenue {...props} />
      case 'calendar': return <Calendar {...props} />
      default: return <Overview {...props} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐾</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Michelle & Milo</h1>
              <p className="text-xs text-gray-500">Social Media Growth Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasData && (
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {DATE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      {hasData && (
        <nav className="bg-white border-b border-orange-100 sticky top-[73px] z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-hide -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 hover:shadow-xl transition-all text-2xl font-bold z-40 flex items-center justify-center"
          title="Add data"
        >
          +
        </button>
      )}

      {/* Data Entry Panel */}
      {showDataEntry && (
        <DataEntryPanel onClose={() => setShowDataEntry(false)} onDataChange={handleDataChange} />
      )}
    </div>
  )
}

export default App
