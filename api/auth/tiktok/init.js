import { setOAuthState } from '../../_lib/redis.js'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const state = crypto.randomBytes(32).toString('hex')
  await setOAuthState(state)

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`
  const redirectUri = `${appUrl}/api/auth/tiktok/callback`

  const csrfState = state
  const scopes = 'user.info.basic,video.list'

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY}&response_type=code&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfState}`

  res.status(200).json({ authUrl })
}
