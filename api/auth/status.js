import { getTokens } from '../_lib/redis.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const meta = await getTokens('meta')
    const tiktok = await getTokens('tiktok')

    res.status(200).json({
      meta: meta
        ? { connected: true, username: meta.username || null, igUserId: meta.igUserId || null, expiresAt: meta.expiresAt || null }
        : { connected: false },
      tiktok: tiktok
        ? { connected: true, username: tiktok.username || null, openId: tiktok.openId || null, expiresAt: tiktok.expiresAt || null }
        : { connected: false },
      facebook: meta
        ? { connected: true, pageId: meta.pageId || null, pageName: meta.pageName || null }
        : { connected: false },
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to check connection status' })
  }
}
