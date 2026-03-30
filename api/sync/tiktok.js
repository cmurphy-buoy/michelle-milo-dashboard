import { getTokens } from '../_lib/redis.js'
import { transformTikTokVideo, mergeReels, mergeFollowers } from '../_lib/transforms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const tokens = await getTokens('tiktok')
  if (!tokens?.accessToken) {
    return res.status(401).json({ error: 'TikTok not connected' })
  }

  const { reels: existingReels = [], followers: existingFollowers = [] } = req.body || {}

  try {
    // Fetch video list
    const videosRes = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,view_count,like_count,comment_count,share_count', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 50 }),
    })
    const videosData = await videosRes.json()
    const videos = videosData.data?.videos || []

    const incomingReels = videos.map(transformTikTokVideo)

    // Get follower count
    let followerCount = 0
    try {
      const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      const userData = await userRes.json()
      followerCount = userData.data?.user?.follower_count || 0
    } catch {}

    const today = new Date().toISOString().slice(0, 10)
    const incomingFollowers = [{
      date: today,
      instagram: 0,
      tiktok: followerCount,
      facebook: 0,
    }]

    const mergedReels = mergeReels(existingReels, incomingReels)
    const mergedFollowers = mergeFollowers(existingFollowers, incomingFollowers)

    res.status(200).json({
      reels: mergedReels,
      followers: mergedFollowers,
      syncedAt: new Date().toISOString(),
      stats: { newReels: incomingReels.length, totalReels: mergedReels.length },
    })
  } catch (err) {
    console.error('TikTok sync error:', err)
    res.status(500).json({ error: 'TikTok sync failed: ' + err.message })
  }
}
