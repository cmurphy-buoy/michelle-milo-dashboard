import { setOAuthState } from '../../_lib/redis.js'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const state = crypto.randomBytes(32).toString('hex')
  await setOAuthState(state)

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`
  const redirectUri = `${appUrl}/api/auth/meta/callback`

  const scopes = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'read_insights',
  ].join(',')

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`

  res.status(200).json({ authUrl })
}
