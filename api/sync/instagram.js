import { getTokens } from '../_lib/redis.js'
import { getIGUser, getMedia, getMediaInsights, getFollowerInsights } from '../_lib/meta-client.js'
import { transformIGMedia, mergeReels, mergeFollowers } from '../_lib/transforms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const tokens = await getTokens('meta')
  if (!tokens?.accessToken || !tokens?.igUserId) {
    return res.status(401).json({ error: 'Instagram not connected' })
  }

  const { reels: existingReels = [], followers: existingFollowers = [] } = req.body || {}

  try {
    // Fetch IG user info for current follower count
    const igUser = await getIGUser(tokens.igUserId, tokens.accessToken)

    // Fetch recent media
    const media = await getMedia(tokens.igUserId, tokens.accessToken, 50)
    const videoMedia = media.filter((m) => m.media_type === 'VIDEO' || m.media_type === 'REELS')

    // Fetch insights for each video (rate-limited: batched)
    const incomingReels = []
    for (const m of videoMedia) {
      const insights = await getMediaInsights(m.id, tokens.accessToken)
      incomingReels.push(transformIGMedia(m, insights))
    }

    // Build follower entry for today
    const today = new Date().toISOString().slice(0, 10)
    const incomingFollowers = [{
      date: today,
      instagram: igUser.followers_count || 0,
      tiktok: 0,
      facebook: 0,
    }]

    // Also try to get historical follower insights (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const followerHistory = await getFollowerInsights(tokens.igUserId, tokens.accessToken, 'day', thirtyDaysAgo)
    followerHistory.forEach((entry) => {
      if (entry.end_time) {
        incomingFollowers.push({
          date: entry.end_time.slice(0, 10),
          instagram: entry.value || 0,
          tiktok: 0,
          facebook: 0,
        })
      }
    })

    // Merge with existing data
    const mergedReels = mergeReels(existingReels, incomingReels)
    const mergedFollowers = mergeFollowers(existingFollowers, incomingFollowers)

    res.status(200).json({
      reels: mergedReels,
      followers: mergedFollowers,
      syncedAt: new Date().toISOString(),
      stats: { newReels: incomingReels.length, totalReels: mergedReels.length },
    })
  } catch (err) {
    console.error('Instagram sync error:', err)
    res.status(500).json({ error: 'Instagram sync failed: ' + err.message })
  }
}
