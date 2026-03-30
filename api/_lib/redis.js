import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

export async function getTokens(platform) {
  return await redis.get(`tokens:${platform}`)
}

export async function setTokens(platform, data) {
  await redis.set(`tokens:${platform}`, data)
}

export async function deleteTokens(platform) {
  await redis.del(`tokens:${platform}`)
}

// ---------------------------------------------------------------------------
// OAuth CSRF state
// ---------------------------------------------------------------------------

export async function setOAuthState(state) {
  await redis.set(`oauth:state:${state}`, '1', { ex: 600 }) // 10 min TTL
}

export async function validateOAuthState(state) {
  const val = await redis.getdel(`oauth:state:${state}`)
  return !!val
}

// ---------------------------------------------------------------------------
// Sync cache (for cron → frontend hydration)
// ---------------------------------------------------------------------------

export async function getCachedSync() {
  return await redis.get('sync:cache')
}

export async function setCachedSync(data) {
  await redis.set('sync:cache', { ...data, cachedAt: new Date().toISOString() })
}

export async function getSyncStatus() {
  return await redis.get('sync:status')
}

export async function setSyncStatus(status) {
  await redis.set('sync:status', { ...status, timestamp: new Date().toISOString() })
}

export default redis
