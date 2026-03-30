// ---------------------------------------------------------------------------
// Transform Meta API responses into the existing localStorage schemas
// ---------------------------------------------------------------------------

export function transformIGMedia(media, insights) {
  return {
    id: `ig-${media.id}`,
    title: (media.caption || '').slice(0, 60) || 'Untitled',
    platform: 'instagram',
    category: 'uncategorized',
    date: media.timestamp ? media.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
    views: insights.plays || insights.video_views || 0,
    likes: media.like_count || 0,
    comments: media.comments_count || 0,
    shares: insights.shares || 0,
    saves: insights.saved || 0,
    reach: insights.reach || 0,
    replays: 0,
    watchTimePct: 0,
    hookRetention: 0,
    nonFollowerReachPct: 0,
    isBreakout: false,
  }
}

export function transformFBPost(post, insights) {
  return {
    id: `fb-${post.id}`,
    title: (post.message || post.caption || '').slice(0, 60) || 'Untitled',
    platform: 'facebook',
    category: 'uncategorized',
    date: post.created_time ? post.created_time.slice(0, 10) : new Date().toISOString().slice(0, 10),
    views: insights.post_impressions || 0,
    likes: post.likes?.summary?.total_count || 0,
    comments: post.comments?.summary?.total_count || 0,
    shares: post.shares?.count || 0,
    saves: 0,
    reach: insights.post_impressions || 0,
    replays: 0,
    watchTimePct: 0,
    hookRetention: 0,
    nonFollowerReachPct: 0,
    isBreakout: false,
  }
}

export function transformTikTokVideo(video) {
  return {
    id: `tt-${video.id}`,
    title: (video.title || video.video_description || '').slice(0, 60) || 'Untitled',
    platform: 'tiktok',
    category: 'uncategorized',
    date: video.create_time
      ? new Date(video.create_time * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    views: video.view_count || 0,
    likes: video.like_count || 0,
    comments: video.comment_count || 0,
    shares: video.share_count || 0,
    saves: 0,
    reach: 0,
    replays: 0,
    watchTimePct: 0,
    hookRetention: 0,
    nonFollowerReachPct: 0,
    isBreakout: false,
  }
}

// ---------------------------------------------------------------------------
// Merge helpers — deduplicate and combine existing + incoming data
// ---------------------------------------------------------------------------

export function mergeReels(existing, incoming) {
  existing = existing || []
  incoming = incoming || []
  const map = new Map()
  existing.forEach((r) => map.set(r.id, r))
  incoming.forEach((r) => {
    const prev = map.get(r.id)
    if (prev) {
      // Update metrics, keep user-set fields (category, isBreakout)
      map.set(r.id, {
        ...r,
        category: prev.category !== 'uncategorized' ? prev.category : r.category,
        isBreakout: prev.isBreakout || r.isBreakout,
        watchTimePct: prev.watchTimePct || r.watchTimePct,
        hookRetention: prev.hookRetention || r.hookRetention,
        nonFollowerReachPct: prev.nonFollowerReachPct || r.nonFollowerReachPct,
      })
    } else {
      map.set(r.id, r)
    }
  })
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function mergeFollowers(existing, incoming) {
  existing = existing || []
  incoming = incoming || []
  const map = new Map()
  existing.forEach((f) => map.set(f.date, { ...f }))
  incoming.forEach((f) => {
    const prev = map.get(f.date) || { date: f.date, instagram: 0, tiktok: 0, facebook: 0 }
    // Only overwrite platform fields that have real data (non-zero)
    if (f.instagram) prev.instagram = f.instagram
    if (f.tiktok) prev.tiktok = f.tiktok
    if (f.facebook) prev.facebook = f.facebook
    prev.combined = (prev.instagram || 0) + (prev.tiktok || 0) + (prev.facebook || 0)
    map.set(f.date, prev)
  })
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}
