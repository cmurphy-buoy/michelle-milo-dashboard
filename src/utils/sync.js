// ---------------------------------------------------------------------------
// Sync utility — frontend API helpers for platform OAuth & data sync
// ---------------------------------------------------------------------------

// All auth routes consolidated into /api/auth?action=X
// Sync routes: /api/sync/all (POST), /api/sync/all?action=cached (GET)

/**
 * Check connection status for all platforms.
 * Returns { meta: { connected, username, expiresAt }, tiktok: {...}, facebook: {...} }
 */
export async function checkConnectionStatus() {
  try {
    const res = await fetch('/api/auth?action=status')
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('Failed to check connection status:', err)
    return null
  }
}

/**
 * Initiate OAuth flow for a platform.
 * Redirects the browser to the platform's OAuth page.
 * @param {'meta' | 'tiktok'} platform
 */
export async function initiateOAuth(platform) {
  try {
    const res = await fetch(`/api/auth?action=${platform}-init`)
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { error: errData.error || `Server returned ${res.status}. Make sure environment variables (META_APP_ID, UPSTASH_REDIS_REST_URL, etc.) are set in Vercel.` }
    }
    const data = await res.json()
    if (data?.authUrl) {
      window.location.href = data.authUrl
      return data
    }
    return { error: 'No auth URL returned. Check that META_APP_ID is set in Vercel environment variables.' }
  } catch (err) {
    console.error(`Failed to initiate OAuth for ${platform}:`, err)
    return { error: 'Could not reach the server. Make sure environment variables are configured in Vercel and the app has been redeployed.' }
  }
}

/**
 * Disconnect a platform.
 * @param {'meta' | 'tiktok'} platform
 */
export async function disconnectPlatform(platform) {
  try {
    const res = await fetch('/api/auth?action=disconnect', {
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
 * Sync all platforms — sends existing data, receives merged/updated data.
 * @param {{ reels: Array, followers: Array }} existingData
 * @returns {{ followers, reels, syncedAt, stats, errors }}
 */
export async function syncAll(existingData) {
  try {
    const res = await fetch('/api/sync/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existingData),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('Failed to sync:', err)
    return null
  }
}

/**
 * Fetch cached sync data from the daily cron.
 * @returns {{ available, reels, followers, cachedAt, status } | null}
 */
export async function fetchCachedSync() {
  try {
    const res = await fetch('/api/sync/all?action=cached')
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error('Failed to fetch cached sync:', err)
    return null
  }
}
