const GRAPH_URL = 'https://graph.facebook.com/v21.0'

async function graphFetch(path, params = {}) {
  const url = new URL(`${GRAPH_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(`Meta API Error: ${data.error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// OAuth Token Exchange
// ---------------------------------------------------------------------------

export async function exchangeCode(code, redirectUri) {
  const data = await graphFetch('/oauth/access_token', {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  })
  return data.access_token
}

export async function getLongLivedToken(shortToken) {
  const data = await graphFetch('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortToken,
  })
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

export async function refreshToken(token) {
  const data = await graphFetch('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: token,
  })
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

// ---------------------------------------------------------------------------
// Account Discovery
// ---------------------------------------------------------------------------

export async function getPages(accessToken) {
  const data = await graphFetch('/me/accounts', { access_token: accessToken })
  return data.data || []
}

export async function getIGBusinessAccount(pageId, accessToken) {
  const data = await graphFetch(`/${pageId}`, {
    fields: 'instagram_business_account',
    access_token: accessToken,
  })
  return data.instagram_business_account?.id || null
}

export async function getIGUser(igUserId, accessToken) {
  const data = await graphFetch(`/${igUserId}`, {
    fields: 'id,username,followers_count,media_count,biography',
    access_token: accessToken,
  })
  return data
}

// ---------------------------------------------------------------------------
// Media & Insights
// ---------------------------------------------------------------------------

export async function getMedia(igUserId, accessToken, limit = 50) {
  const data = await graphFetch(`/${igUserId}/media`, {
    fields: 'id,caption,timestamp,media_type,like_count,comments_count,media_url,permalink',
    limit: String(limit),
    access_token: accessToken,
  })
  return data.data || []
}

export async function getMediaInsights(mediaId, accessToken) {
  try {
    const data = await graphFetch(`/${mediaId}/insights`, {
      metric: 'reach,shares,saved,plays',
      access_token: accessToken,
    })
    const metrics = {}
    ;(data.data || []).forEach((m) => {
      metrics[m.name] = m.values?.[0]?.value || 0
    })
    return metrics
  } catch {
    return { reach: 0, shares: 0, saved: 0, plays: 0 }
  }
}

export async function getFollowerInsights(igUserId, accessToken, period = 'day', since = null) {
  const params = {
    metric: 'follower_count',
    period,
    access_token: accessToken,
  }
  if (since) params.since = String(Math.floor(since.getTime() / 1000))
  try {
    const data = await graphFetch(`/${igUserId}/insights`, params)
    return data.data?.[0]?.values || []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Facebook Page Insights
// ---------------------------------------------------------------------------

export async function getPageFollowers(pageId, accessToken) {
  const data = await graphFetch(`/${pageId}`, {
    fields: 'followers_count,fan_count',
    access_token: accessToken,
  })
  return data.followers_count || data.fan_count || 0
}

export async function getPagePostInsights(postId, accessToken) {
  try {
    const data = await graphFetch(`/${postId}/insights`, {
      metric: 'post_impressions,post_engaged_users,post_clicks',
      access_token: accessToken,
    })
    const metrics = {}
    ;(data.data || []).forEach((m) => {
      metrics[m.name] = m.values?.[0]?.value || 0
    })
    return metrics
  } catch {
    return {}
  }
}
