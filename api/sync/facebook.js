import { getTokens } from '../_lib/redis.js'
import { getPageFollowers } from '../_lib/meta-client.js'
import { mergeFollowers } from '../_lib/transforms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const tokens = await getTokens('meta')
  if (!tokens?.pageAccessToken || !tokens?.pageId) {
    return res.status(401).json({ error: 'Facebook not connected' })
  }

  const { followers: existingFollowers = [] } = req.body || {}

  try {
    const fbFollowers = await getPageFollowers(tokens.pageId, tokens.pageAccessToken)

    const today = new Date().toISOString().slice(0, 10)
    const incomingFollowers = [{
      date: today,
      instagram: 0,
      tiktok: 0,
      facebook: fbFollowers,
    }]

    const mergedFollowers = mergeFollowers(existingFollowers, incomingFollowers)

    res.status(200).json({
      followers: mergedFollowers,
      syncedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Facebook sync error:', err)
    res.status(500).json({ error: 'Facebook sync failed: ' + err.message })
  }
}
