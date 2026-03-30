import { getCachedSync, getSyncStatus } from '../_lib/redis.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const cached = await getCachedSync()
    const status = await getSyncStatus()

    if (!cached) {
      return res.status(200).json({ available: false, status })
    }

    res.status(200).json({
      available: true,
      ...cached,
      status,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cached sync data' })
  }
}
