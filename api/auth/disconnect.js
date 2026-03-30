import { deleteTokens } from '../_lib/redis.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { platform } = req.body || {}
  if (!['meta', 'tiktok'].includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform. Use "meta" or "tiktok".' })
  }

  try {
    await deleteTokens(platform)
    res.status(200).json({ success: true, message: `${platform} disconnected` })
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect' })
  }
}
