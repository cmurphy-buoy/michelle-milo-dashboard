import { validateOAuthState, setTokens } from '../../_lib/redis.js'
import { exchangeCode, getLongLivedToken, getPages, getIGBusinessAccount, getIGUser } from '../../_lib/meta-client.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, state, error: authError } = req.query

  if (authError) {
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`
    return res.redirect(`${appUrl}/?error=auth_denied`)
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state' })
  }

  // Validate CSRF state
  const validState = await validateOAuthState(state)
  if (!validState) {
    return res.status(403).json({ error: 'Invalid or expired state. Please try connecting again.' })
  }

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`
  const redirectUri = `${appUrl}/api/auth/meta/callback`

  try {
    // Exchange code for short-lived token
    const shortToken = await exchangeCode(code, redirectUri)

    // Exchange for long-lived token (60 days)
    const { accessToken, expiresIn } = await getLongLivedToken(shortToken)
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Discover Pages and IG Business Account
    const pages = await getPages(accessToken)
    if (!pages.length) {
      return res.redirect(`${appUrl}/?error=no_pages`)
    }

    const page = pages[0] // Use first page
    const igUserId = await getIGBusinessAccount(page.id, accessToken)

    let username = null
    if (igUserId) {
      const igUser = await getIGUser(igUserId, accessToken)
      username = igUser.username
    }

    // Store tokens in Redis
    await setTokens('meta', {
      accessToken,
      expiresAt,
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      igUserId,
      username,
      connectedAt: new Date().toISOString(),
    })

    res.redirect(`${appUrl}/?connected=meta`)
  } catch (err) {
    console.error('Meta OAuth callback error:', err)
    res.redirect(`${appUrl}/?error=auth_failed`)
  }
}
