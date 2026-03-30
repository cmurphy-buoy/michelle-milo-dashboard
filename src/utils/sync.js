// ---------------------------------------------------------------------------
// Sync utility — frontend API helpers for platform OAuth & data sync
// ---------------------------------------------------------------------------

const API_BASE = '/api'

/**
 * Check connection status for all platforms.
 * GET /api/auth/status
 * Returns { meta: { connected, username, expiresAt }, tiktok: {...}, facebook: {...} }
 */
export async function checkConnectionStatus() {
  try {
    const res = await fetch(`${API_BASE}/auth/status`)
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('Failed to check connection status:', err)
    return null
  }
}

/**
 * Initiate OAuth flow for a platform.
 * GET /api/auth/{platform}/init → { authUrl }
 * Redirects the browser to the returned authUrl.
 * @param {'meta' | 'tiktok'} platform
 */
export async function initiateOAuth(platform) {
  try {
    const res = await fetch(`${API_BASE}/auth/${platform}/init`)
    if (!res.ok) return null
    const data = await res.json()
    if (data && data.authUrl) {
      window.location.href = data.authUrl
    }
    return data
  } catch (err) {
    console.error(`Failed to initiate OAuth for ${platform}:`, err)
    return null
  }
}

/**
 * Disconnect a platform.
 * POST /api/auth/disconnect with body { platform }
 * @param {'meta' | 'tiktok' | 'facebook'} platform
 */
export async function disconnectPlatform(platform) {
  try {
    const res = await fetch(`${API_BASE}/auth/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error(`Failed to disconnect ${platform}:`, err)
    return null
  }
}

/**
 * Sync all platforms — sends existing local data and receives merged/updated data.
 * POST /api/sync/all with body { reels, followers }
 * Returns { followers, reels, syncedAt }
 * @param {{ reels: Array, followers: Array }} existingData
 */
export async function syncAll(existingData) {
  try {
    const res = await fetch(`${API_BASE}/sync/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existingData),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('Failed to sync all platforms:', err)
    return null
  }
}

/**
 * Fetch cached sync data (populated by server-side cron).
 * GET /api/sync/cached → cached data object or null
 */
export async function fetchCachedSync() {
  try {
    const res = await fetch(`${API_BASE}/sync/cached`)
    if (!res.ok) return null
    const data = await res.json()
    return data || null
  } catch (err) {
    console.error('Failed to fetch cached sync:', err)
    return null
  }
}
