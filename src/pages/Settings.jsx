import { useState, useEffect } from 'react'
import {
  checkConnectionStatus,
  initiateOAuth,
  disconnectPlatform,
  syncAll,
  fetchCachedSync,
} from '../utils/sync'
import { getData, saveData, KEYS } from '../utils/storage'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYNC_STATUS_KEY = KEYS.SYNC + 'status'

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '\u{1F4F8}',
    oauthKey: 'meta',
    statusKey: 'meta',
    color: 'from-pink-500 to-purple-500',
    note: null,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '\u{1F3B5}',
    oauthKey: 'tiktok',
    statusKey: 'tiktok',
    color: 'from-gray-900 to-gray-700',
    note: null,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '\u{1F465}',
    oauthKey: 'meta',
    statusKey: 'facebook',
    color: 'from-blue-600 to-blue-400',
    note: 'Connects automatically with Instagram (same Meta OAuth)',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '\u{1F4BC}',
    oauthKey: 'linkedin',
    statusKey: 'linkedin',
    color: 'from-blue-700 to-blue-500',
    note: 'Coming soon — LinkedIn API integration is in development.',
  },
]

const SETUP_STEPS = [
  {
    title: 'Convert Instagram to Business or Creator account',
    description:
      'Open Instagram, go to Settings > Account > Switch to Professional Account. Choose Creator or Business. This unlocks the Insights API that powers follower and reel analytics in the dashboard.',
  },
  {
    title: 'Link Instagram to a Facebook Page',
    description:
      'In Instagram Settings > Linked Accounts, connect your Facebook Page. Meta requires this link before their Graph API will return Instagram data. Create a Page first if you do not have one.',
  },
  {
    title: 'Create a Meta Developer App',
    description:
      'Go to developers.facebook.com, create a new app (type: Business), and add the Instagram Graph API product. Generate a long-lived token with pages_show_list, instagram_basic, and instagram_manage_insights permissions.',
  },
  {
    title: 'Set up TikTok Developer App (optional)',
    description:
      'Visit developers.tiktok.com, register an app, and request the Research API or Login Kit scopes. TikTok approval can take a few days. This step is only needed if you want automated TikTok sync.',
  },
]

// ---------------------------------------------------------------------------
// ConnectionCard
// ---------------------------------------------------------------------------

function ConnectionCard({ platform, status, onConnect, onDisconnect, onSync, syncing }) {
  const connected = status?.connected || false
  const username = status?.username || null
  const expiresAt = status?.expiresAt || null

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header stripe */}
      <div className={`h-1.5 bg-gradient-to-r ${platform.color}`} />

      <div className="p-5">
        {/* Platform name + status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{platform.icon}</span>
            <h3 className="text-lg font-semibold text-gray-800">{platform.name}</h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              connected
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Platform note */}
        {platform.note && (
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">{platform.note}</p>
        )}

        {connected ? (
          <>
            {/* Connected details */}
            <div className="space-y-1.5 mb-4 text-sm text-gray-600">
              {username && (
                <p>
                  <span className="text-gray-400">Account:</span>{' '}
                  <span className="font-medium text-gray-700">@{username}</span>
                </p>
              )}
              {formattedExpiry && (
                <p>
                  <span className="text-gray-400">Token expires:</span>{' '}
                  <span className="font-medium text-gray-700">{formattedExpiry}</span>
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onDisconnect(platform.oauthKey)}
                className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Disconnect
              </button>
              <button
                onClick={onSync}
                disabled={syncing}
                className="flex-1 px-3 py-2 text-sm font-medium text-[#0f1b4c] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync All'}
              </button>
            </div>
          </>
        ) : (
          /* Connect button */
          <button
            onClick={() => onConnect(platform.oauthKey)}
            className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#0f1b4c] rounded-lg hover:bg-[#1a2d6d] transition-colors shadow-sm"
          >
            Connect {platform.name}
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SyncStatusSection
// ---------------------------------------------------------------------------

function SyncStatusSection({ lastSync, onSyncAll, syncing, toast }) {
  const formattedSync = lastSync
    ? new Date(lastSync).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Never'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Sync Status</h2>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Last synced</p>
          <p className="text-base font-medium text-gray-700">{formattedSync}</p>
        </div>
        <button
          onClick={onSyncAll}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0f1b4c] rounded-xl hover:bg-[#1a2d6d] transition-colors shadow-sm disabled:opacity-50"
        >
          {syncing && (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {syncing ? 'Syncing All...' : 'Sync All Platforms'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mt-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AccountSetupGuide
// ---------------------------------------------------------------------------

function AccountSetupGuide() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-blue-50/40 transition-colors"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Account Setup Guide</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Steps to connect your social accounts to the dashboard
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Steps */}
      {expanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
          {SETUP_STEPS.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              {/* Step number */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-[#0f1b4c] flex items-center justify-center text-sm font-bold">
                {idx + 1}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700">{step.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

export default function Settings() {
  // Connection status per platform (keyed by statusKey: meta, tiktok, facebook)
  const [connections, setConnections] = useState({
    meta: null,
    tiktok: null,
    facebook: null,
    linkedin: null,
  })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)
  const [lastSync, setLastSync] = useState(() => {
    const syncStatus = getData(SYNC_STATUS_KEY)
    return syncStatus?.syncedAt || null
  })

  // -----------------------------------------------------------------------
  // Load connection status on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    async function load() {
      const status = await checkConnectionStatus()
      if (cancelled) return

      if (status) {
        setConnections({
          meta: status.meta || null,
          tiktok: status.tiktok || null,
          facebook: status.facebook || null,
          linkedin: status.linkedin || null,
        })
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  async function handleConnect(oauthKey) {
    const result = await initiateOAuth(oauthKey)
    if (result?.error) {
      setToast({ type: 'error', message: result.error })
    }
  }

  async function handleDisconnect(oauthKey) {
    const result = await disconnectPlatform(oauthKey)
    if (result) {
      // Refresh connection status
      const status = await checkConnectionStatus()
      if (status) {
        setConnections({
          meta: status.meta || null,
          tiktok: status.tiktok || null,
          facebook: status.facebook || null,
          linkedin: status.linkedin || null,
        })
      }
      setToast({ type: 'success', message: 'Platform disconnected successfully.' })
    } else {
      setToast({ type: 'error', message: 'Failed to disconnect. Please try again.' })
    }
  }

  async function handleSyncAll() {
    setSyncing(true)
    setToast(null)

    const existingData = {
      reels: getData(KEYS.REELS + 'all') || [],
      followers: getData(KEYS.FOLLOWERS + 'daily') || [],
    }

    const result = await syncAll(existingData)

    if (result) {
      // Persist synced data
      if (result.followers) saveData(KEYS.FOLLOWERS + 'daily', result.followers)
      if (result.reels) saveData(KEYS.REELS + 'all', result.reels)
      const syncedAt = result.syncedAt || new Date().toISOString()
      saveData(SYNC_STATUS_KEY, { syncedAt })
      setLastSync(syncedAt)
      setToast({ type: 'success', message: 'All platforms synced successfully!' })
    } else {
      // Try cached data as fallback
      const cached = await fetchCachedSync()
      if (cached?.available) {
        if (cached.followers) saveData(KEYS.FOLLOWERS + 'daily', cached.followers)
        if (cached.reels) saveData(KEYS.REELS + 'all', cached.reels)
        const syncedAt = cached.syncedAt || new Date().toISOString()
        saveData(SYNC_STATUS_KEY, { syncedAt })
        setLastSync(syncedAt)
        setToast({ type: 'success', message: 'Loaded cached sync data.' })
      } else {
        setToast({ type: 'error', message: 'Sync failed. Check your connections and try again.' })
      }
    }

    setSyncing(false)
  }

  async function handleSyncSingle() {
    // Per-platform sync is not yet supported by the API; delegates to full sync
    await handleSyncAll()
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg
          className="animate-spin h-8 w-8 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage platform connections, sync data, and configure your dashboard.
        </p>
      </div>

      {/* Section 1 — Platform Connections */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Platform Connections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map((p) => (
            <ConnectionCard
              key={p.id}
              platform={p}
              status={connections[p.statusKey]}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSync={handleSyncSingle}
              syncing={syncing}
            />
          ))}
        </div>
      </section>

      {/* Section 2 — Sync Status */}
      <section>
        <SyncStatusSection
          lastSync={lastSync}
          onSyncAll={handleSyncAll}
          syncing={syncing}
          toast={toast}
        />
      </section>

      {/* Section 3 — Account Setup Guide */}
      <section>
        <AccountSetupGuide />
      </section>
    </div>
  )
}
