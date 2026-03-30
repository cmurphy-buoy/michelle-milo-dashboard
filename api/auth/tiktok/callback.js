import { validateOAuthState, setTokens } from '../../_lib/redis.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, state, error: authError } = req.query
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`

  if (authError) return res.redirect(`${appUrl}/?error=tiktok_denied`)
  if (!code || !state) return res.status(400).json({ error: 'Missing code or state' })

  const validState = await validateOAuthState(state)
  if (!validState) return res.status(403).json({ error: 'Invalid state' })

  const redirectUri = `${appUrl}/api/auth/tiktok/callback`

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) throw new Error(tokenData.error.message || 'Token exchange failed')

    const { access_token, refresh_token, open_id, expires_in } = tokenData.data || tokenData
    const expiresAt = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString()

    // Get user info
    let username = null
    try {
      const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const userData = await userRes.json()
      username = userData.data?.user?.display_name || null
    } catch {}

    await setTokens('tiktok', {
      accessToken: access_token,
      refreshToken: refresh_token,
      openId: open_id,
      username,
      expiresAt,
      connectedAt: new Date().toISOString(),
    })

    res.redirect(`${appUrl}/?connected=tiktok`)
  } catch (err) {
    console.error('TikTok OAuth error:', err)
    res.redirect(`${appUrl}/?error=tiktok_failed`)
  }
}
