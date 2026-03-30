import crypto from 'crypto'
import { getTokens, setTokens, deleteTokens, setOAuthState, validateOAuthState } from './_lib/redis.js'
import { exchangeCode, getLongLivedToken, refreshToken as refreshMetaToken, getPages, getIGBusinessAccount, getIGUser } from './_lib/meta-client.js'

export default async function handler(req, res) {
  const { action } = req.query

  // --- GET /api/auth?action=status ---
  if (action === 'status') {
    try {
      const meta = await getTokens('meta')
      const tiktok = await getTokens('tiktok')
      const metaConnected = meta?.accessToken && (!meta.expiresAt || new Date(meta.expiresAt) > new Date())
      const tiktokConnected = tiktok?.accessToken && (!tiktok.expiresAt || new Date(tiktok.expiresAt) > new Date())
      return res.status(200).json({
        meta: metaConnected ? { connected: true, username: meta.username, igUserId: meta.igUserId, expiresAt: meta.expiresAt } : { connected: false, expired: meta?.expiresAt ? new Date(meta.expiresAt) <= new Date() : false },
        tiktok: tiktokConnected ? { connected: true, username: tiktok.username, openId: tiktok.openId, expiresAt: tiktok.expiresAt } : { connected: false, expired: tiktok?.expiresAt ? new Date(tiktok.expiresAt) <= new Date() : false },
        facebook: metaConnected ? { connected: true, pageId: meta.pageId, pageName: meta.pageName } : { connected: false },
      })
    } catch { return res.status(500).json({ error: 'Failed to check status' }) }
  }

  // --- GET /api/auth?action=meta-init ---
  if (action === 'meta-init') {
    const state = crypto.randomBytes(32).toString('hex')
    await setOAuthState(state)
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`
    const redirectUri = `${appUrl}/api/auth?action=meta-callback`
    const scopes = 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement,read_insights'
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`
    return res.status(200).json({ authUrl })
  }

  // --- GET /api/auth?action=meta-callback ---
  if (action === 'meta-callback') {
    const { code, state, error: authError } = req.query
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`
    if (authError) return res.redirect(`${appUrl}/?error=auth_denied`)
    if (!code || !state) return res.status(400).json({ error: 'Missing code or state' })
    const validState = await validateOAuthState(state)
    if (!validState) return res.status(403).json({ error: 'Invalid state' })
    const redirectUri = `${appUrl}/api/auth?action=meta-callback`
    try {
      const shortToken = await exchangeCode(code, redirectUri)
      const { accessToken, expiresIn } = await getLongLivedToken(shortToken)
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
      const pages = await getPages(accessToken)
      if (!pages.length) return res.redirect(`${appUrl}/?error=no_pages`)
      const page = pages[0]
      const igUserId = await getIGBusinessAccount(page.id, accessToken)
      let username = null
      if (igUserId) { const u = await getIGUser(igUserId, accessToken); username = u.username }
      await setTokens('meta', { accessToken, expiresAt, pageId: page.id, pageName: page.name, pageAccessToken: page.access_token, igUserId, username, connectedAt: new Date().toISOString() })
      return res.redirect(`${appUrl}/?connected=meta`)
    } catch (err) {
      console.error('Meta OAuth error:', err)
      return res.redirect(`${appUrl}/?error=auth_failed`)
    }
  }

  // --- GET /api/auth?action=tiktok-init ---
  if (action === 'tiktok-init') {
    const state = crypto.randomBytes(32).toString('hex')
    await setOAuthState(state)
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`
    const redirectUri = `${appUrl}/api/auth?action=tiktok-callback`
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY}&response_type=code&scope=user.info.basic,video.list&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
    return res.status(200).json({ authUrl })
  }

  // --- GET /api/auth?action=tiktok-callback ---
  if (action === 'tiktok-callback') {
    const { code, state, error: authError } = req.query
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`
    if (authError) return res.redirect(`${appUrl}/?error=tiktok_denied`)
    if (!code || !state) return res.status(400).json({ error: 'Missing code or state' })
    const validState = await validateOAuthState(state)
    if (!validState) return res.status(403).json({ error: 'Invalid state' })
    const redirectUri = `${appUrl}/api/auth?action=tiktok-callback`
    try {
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY, client_secret: process.env.TIKTOK_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
      })
      const tokenData = await tokenRes.json()
      if (tokenData.error) throw new Error(tokenData.error.message)
      const { access_token, refresh_token, open_id, expires_in } = tokenData.data || tokenData
      const expiresAt = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString()
      let username = null
      try { const u = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count', { headers: { Authorization: `Bearer ${access_token}` } }); const d = await u.json(); username = d.data?.user?.display_name } catch {}
      await setTokens('tiktok', { accessToken: access_token, refreshToken: refresh_token, openId: open_id, username, expiresAt, connectedAt: new Date().toISOString() })
      return res.redirect(`${appUrl}/?connected=tiktok`)
    } catch (err) {
      console.error('TikTok OAuth error:', err)
      return res.redirect(`${appUrl}/?error=tiktok_failed`)
    }
  }

  // --- POST /api/auth?action=disconnect ---
  if (action === 'disconnect' && req.method === 'POST') {
    const { platform } = req.body || {}
    if (!['meta', 'tiktok'].includes(platform)) return res.status(400).json({ error: 'Invalid platform' })
    await deleteTokens(platform)
    return res.status(200).json({ success: true })
  }

  // --- POST /api/auth?action=refresh ---
  if (action === 'refresh' && req.method === 'POST') {
    const results = {}
    try {
      const meta = await getTokens('meta')
      if (meta?.accessToken && meta?.expiresAt) {
        const days = (new Date(meta.expiresAt) - Date.now()) / 86400000
        if (days < 10) {
          const { accessToken, expiresIn } = await refreshMetaToken(meta.accessToken)
          const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()
          await setTokens('meta', { ...meta, accessToken, expiresAt: newExpiry })
          results.meta = { refreshed: true, expiresAt: newExpiry }
        } else { results.meta = { refreshed: false, daysLeft: Math.round(days) } }
      }
    } catch (err) { results.meta = { error: err.message } }
    return res.status(200).json(results)
  }

  res.status(400).json({ error: 'Unknown action. Use action=status|meta-init|meta-callback|tiktok-init|tiktok-callback|disconnect|refresh' })
}
