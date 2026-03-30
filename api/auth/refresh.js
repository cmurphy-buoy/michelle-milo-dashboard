import { getTokens, setTokens } from '../_lib/redis.js'
import { refreshToken as refreshMetaToken } from '../_lib/meta-client.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const results = { meta: null, tiktok: null }

  // Refresh Meta token if within 10 days of expiry
  try {
    const meta = await getTokens('meta')
    if (meta?.accessToken && meta?.expiresAt) {
      const daysUntilExpiry = (new Date(meta.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24)
      if (daysUntilExpiry < 10) {
        const { accessToken, expiresIn } = await refreshMetaToken(meta.accessToken)
        const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()
        await setTokens('meta', { ...meta, accessToken, expiresAt: newExpiry, refreshedAt: new Date().toISOString() })
        results.meta = { refreshed: true, expiresAt: newExpiry }
      } else {
        results.meta = { refreshed: false, reason: `${Math.round(daysUntilExpiry)} days until expiry` }
      }
    }
  } catch (err) {
    results.meta = { refreshed: false, error: err.message }
  }

  // Refresh TikTok token
  try {
    const tiktok = await getTokens('tiktok')
    if (tiktok?.refreshToken) {
      const daysUntilExpiry = (new Date(tiktok.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24)
      if (daysUntilExpiry < 10) {
        const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY,
            client_secret: process.env.TIKTOK_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: tiktok.refreshToken,
          }),
        })
        const data = await tokenRes.json()
        if (data.data?.access_token) {
          const newExpiry = new Date(Date.now() + (data.data.expires_in || 86400) * 1000).toISOString()
          await setTokens('tiktok', { ...tiktok, accessToken: data.data.access_token, refreshToken: data.data.refresh_token || tiktok.refreshToken, expiresAt: newExpiry })
          results.tiktok = { refreshed: true, expiresAt: newExpiry }
        }
      } else {
        results.tiktok = { refreshed: false, reason: `${Math.round(daysUntilExpiry)} days until expiry` }
      }
    }
  } catch (err) {
    results.tiktok = { refreshed: false, error: err.message }
  }

  res.status(200).json(results)
}
