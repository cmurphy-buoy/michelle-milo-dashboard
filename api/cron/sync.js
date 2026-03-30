import { getTokens, setCachedSync, setSyncStatus } from '../_lib/redis.js'
import { getIGUser, getMedia, getMediaInsights, getFollowerInsights, getPageFollowers } from '../_lib/meta-client.js'
import { refreshToken as refreshMetaToken } from '../_lib/meta-client.js'
import { transformIGMedia, transformTikTokVideo, mergeReels, mergeFollowers } from '../_lib/transforms.js'
import { setTokens } from '../_lib/redis.js'

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const errors = []
  let reels = []
  let followers = []

  // --- Refresh tokens if needed ---
  const meta = await getTokens('meta')
  if (meta?.accessToken && meta?.expiresAt) {
    const daysUntilExpiry = (new Date(meta.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysUntilExpiry < 10) {
      try {
        const { accessToken, expiresIn } = await refreshMetaToken(meta.accessToken)
        const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()
        await setTokens('meta', { ...meta, accessToken, expiresAt: newExpiry, refreshedAt: new Date().toISOString() })
        meta.accessToken = accessToken
      } catch (err) {
        errors.push({ platform: 'meta-refresh', error: err.message })
      }
    }
  }

  // --- Instagram sync ---
  if (meta?.accessToken && meta?.igUserId) {
    try {
      const igUser = await getIGUser(meta.igUserId, meta.accessToken)
      const media = await getMedia(meta.igUserId, meta.accessToken, 50)
      const videoMedia = media.filter((m) => m.media_type === 'VIDEO' || m.media_type === 'REELS')

      for (const m of videoMedia) {
        const insights = await getMediaInsights(m.id, meta.accessToken)
        reels.push(transformIGMedia(m, insights))
      }

      const today = new Date().toISOString().slice(0, 10)
      const igFollowers = [{ date: today, instagram: igUser.followers_count || 0, tiktok: 0, facebook: 0 }]

      // Fetch 30-day historical follower data (matches sync/all.js logic)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const followerHistory = await getFollowerInsights(meta.igUserId, meta.accessToken, 'day', thirtyDaysAgo)
      followerHistory.forEach((entry) => {
        if (entry.end_time) igFollowers.push({ date: entry.end_time.slice(0, 10), instagram: entry.value || 0, tiktok: 0, facebook: 0 })
      })

      followers = mergeFollowers(followers, igFollowers)
    } catch (err) {
      errors.push({ platform: 'instagram', error: err.message })
    }
  }

  // --- Facebook sync ---
  if (meta?.pageAccessToken && meta?.pageId) {
    try {
      const fbFollowers = await getPageFollowers(meta.pageId, meta.pageAccessToken)
      const today = new Date().toISOString().slice(0, 10)
      followers = mergeFollowers(followers, [{ date: today, instagram: 0, tiktok: 0, facebook: fbFollowers }])
    } catch (err) {
      errors.push({ platform: 'facebook', error: err.message })
    }
  }

  // --- TikTok sync ---
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
      reels = mergeReels(reels, videos.map(transformTikTokVideo))

      let ttFollowers = 0
      try {
        const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count', {
          headers: { Authorization: `Bearer ${tiktok.accessToken}` },
        })
        const userData = await userRes.json()
        ttFollowers = userData.data?.user?.follower_count || 0
      } catch {}

      const today = new Date().toISOString().slice(0, 10)
      followers = mergeFollowers(followers, [{ date: today, instagram: 0, tiktok: ttFollowers, facebook: 0 }])
    } catch (err) {
      errors.push({ platform: 'tiktok', error: err.message })
    }
  }

  // Cache results for frontend hydration
  await setCachedSync({ reels, followers })
  await setSyncStatus({ status: errors.length ? 'partial' : 'success', errors })

  res.status(200).json({ success: true, errors, stats: { reels: reels.length, followerEntries: followers.length } })
}
