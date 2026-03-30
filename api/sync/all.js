import { getTokens, setSyncStatus } from '../_lib/redis.js'
import { getIGUser, getMedia, getMediaInsights, getFollowerInsights, getPageFollowers } from '../_lib/meta-client.js'
import { transformIGMedia, transformTikTokVideo, mergeReels, mergeFollowers } from '../_lib/transforms.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let { reels: existingReels = [], followers: existingFollowers = [] } = req.body || {}
  const errors = []
  const stats = { instagram: null, tiktok: null, facebook: null }

  // --- Instagram ---
  const meta = await getTokens('meta')
  if (meta?.accessToken && meta?.igUserId) {
    try {
      const igUser = await getIGUser(meta.igUserId, meta.accessToken)
      const media = await getMedia(meta.igUserId, meta.accessToken, 50)
      const videoMedia = media.filter((m) => m.media_type === 'VIDEO' || m.media_type === 'REELS')

      const igReels = []
      for (const m of videoMedia) {
        const insights = await getMediaInsights(m.id, meta.accessToken)
        igReels.push(transformIGMedia(m, insights))
      }

      existingReels = mergeReels(existingReels, igReels)

      const today = new Date().toISOString().slice(0, 10)
      const igFollowers = [{ date: today, instagram: igUser.followers_count || 0, tiktok: 0, facebook: 0 }]

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const followerHistory = await getFollowerInsights(meta.igUserId, meta.accessToken, 'day', thirtyDaysAgo)
      followerHistory.forEach((entry) => {
        if (entry.end_time) igFollowers.push({ date: entry.end_time.slice(0, 10), instagram: entry.value || 0, tiktok: 0, facebook: 0 })
      })

      existingFollowers = mergeFollowers(existingFollowers, igFollowers)
      stats.instagram = { reels: igReels.length, followers: igUser.followers_count }
    } catch (err) {
      errors.push({ platform: 'instagram', error: err.message })
    }
  }

  // --- Facebook ---
  if (meta?.pageAccessToken && meta?.pageId) {
    try {
      const fbFollowers = await getPageFollowers(meta.pageId, meta.pageAccessToken)
      const today = new Date().toISOString().slice(0, 10)
      existingFollowers = mergeFollowers(existingFollowers, [{ date: today, instagram: 0, tiktok: 0, facebook: fbFollowers }])
      stats.facebook = { followers: fbFollowers }
    } catch (err) {
      errors.push({ platform: 'facebook', error: err.message })
    }
  }

  // --- TikTok ---
  const tiktok = await getTokens('tiktok')
  if (tiktok?.accessToken) {
    try {
      const videosRes = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,view_count,like_count,comment_count,share_count', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tiktok.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_count: 50 }),
      })
      const videosData = await videosRes.json()
      const videos = videosData.data?.videos || []
      const ttReels = videos.map(transformTikTokVideo)
      existingReels = mergeReels(existingReels, ttReels)

      let ttFollowers = 0
      try {
        const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count', {
          headers: { Authorization: `Bearer ${tiktok.accessToken}` },
        })
        const userData = await userRes.json()
        ttFollowers = userData.data?.user?.follower_count || 0
      } catch {}

      const today = new Date().toISOString().slice(0, 10)
      existingFollowers = mergeFollowers(existingFollowers, [{ date: today, instagram: 0, tiktok: ttFollowers, facebook: 0 }])
      stats.tiktok = { reels: ttReels.length, followers: ttFollowers }
    } catch (err) {
      errors.push({ platform: 'tiktok', error: err.message })
    }
  }

  await setSyncStatus({ status: errors.length ? 'partial' : 'success', errors, stats })

  res.status(200).json({
    reels: existingReels,
    followers: existingFollowers,
    syncedAt: new Date().toISOString(),
    stats,
    errors,
  })
}
