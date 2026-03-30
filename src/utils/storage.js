// ---------------------------------------------------------------------------
// Storage utility — wraps localStorage with JSON serialization
// ---------------------------------------------------------------------------

export const KEYS = {
  FOLLOWERS: 'mm:followers:',
  REELS: 'mm:reels:',
  COMPETITORS: 'mm:competitors:',
  REVENUE: 'mm:revenue:',
  CALENDAR: 'mm:calendar:',
  IDEAS: 'mm:ideas:',
  HASHTAGS: 'mm:hashtags:',
  TRENDS: 'mm:trends:',
  TEMPLATES: 'mm:templates:',
  SYNC: 'mm:sync:',
}

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

export function getData(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function deleteData(key) {
  localStorage.removeItem(key)
}

export function getAllKeys() {
  return Object.keys(localStorage).filter((k) => k.startsWith('mm:'))
}

// ---------------------------------------------------------------------------
// Demo data helpers
// ---------------------------------------------------------------------------

// Mulberry32 — deterministic 32-bit PRNG
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randBetween(rng, min, max) {
  return Math.round(min + rng() * (max - min))
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function dateStr(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// loadDemoData — populates storage with 30 days of realistic sample data
// ---------------------------------------------------------------------------

export function loadDemoData() {
  const rng = mulberry32(42)

  // Clear any existing demo data
  getAllKeys().forEach((k) => localStorage.removeItem(k))

  generateFollowerData(rng)
  generateReelData(rng)
  generateCompetitorData(rng)
  generateRevenueData(rng)
  generateCalendarData(rng)
  generateIdeasData()
  generateHashtagData()
  generateTrendsData(rng)
  generateTemplatesData()
}

// ---------------------------------------------------------------------------
// Followers — daily snapshots for 30 days, 3 platforms
// ---------------------------------------------------------------------------

function generateFollowerData(rng) {
  const days = 30
  const snapshots = []

  // Starting counts (day 30 ago)
  let ig = 48200
  let tt = 29100
  let fb = 14600

  for (let i = days; i >= 0; i--) {
    // Instagram: ~80-140/day organic, breakout bump days 16-14
    let igGain = randBetween(rng, 80, 140)
    if (i <= 16 && i >= 14) igGain += randBetween(rng, 300, 500) // breakout spike

    // TikTok: more volatile, ~60-200/day
    let ttGain = randBetween(rng, 60, 200)
    if (i <= 12 && i >= 10) ttGain += randBetween(rng, 200, 400) // viral moment

    // Facebook: slow & steady, ~15-35/day
    const fbGain = randBetween(rng, 15, 35)

    ig += igGain
    tt += ttGain
    fb += fbGain

    snapshots.push({
      date: dateStr(i),
      instagram: ig,
      tiktok: tt,
      facebook: fb,
      combined: ig + tt + fb,
    })
  }

  saveData(KEYS.FOLLOWERS + 'daily', snapshots)
}

// ---------------------------------------------------------------------------
// Reels — ~45 reels over 30 days across 3 platforms
// ---------------------------------------------------------------------------

function generateReelData(rng) {
  const categories = ['tricks', 'day-in-life', 'funny', 'grooming', 'travel']

  const reelTitles = {
    tricks: [
      'Milo learns to high-five',
      'Spin trick in slow motion',
      'Teaching Milo to ring a bell',
      'Milo vs the obstacle course',
      'New trick: play dead',
      'Shake hands compilation',
      'Milo catches treats mid-air',
      'Balance treat on nose challenge',
    ],
    'day-in-life': [
      'Morning routine with Milo',
      'A day at the dog park',
      'Milo picks his own outfit',
      'Rainy day vibes with Milo',
      'Milo helps with groceries',
      'Sunday snuggles with Milo',
      'Milo meets the mailman again',
    ],
    funny: [
      'Milo judges my cooking',
      'POV: Milo hears the treat bag',
      'Milo steals my spot on the couch',
      'When Milo sees another dog',
      'Milo vs the vacuum cleaner',
      'Dramatic Milo refuses bath time',
      'Milo acts guilty for no reason',
    ],
    grooming: [
      'Spa day transformation',
      'Brushing out Milo\'s fluff',
      'Nail trim routine',
      'Bath time ASMR with Milo',
      'Before & after grooming glow-up',
    ],
    travel: [
      'Milo\'s first beach trip',
      'Road trip with Milo',
      'Milo explores a new hiking trail',
      'Hotel room tour — dog edition',
      'Milo at the farmer\'s market',
    ],
  }

  const platforms = ['instagram', 'tiktok', 'facebook']
  const reels = []
  let reelId = 1

  for (let i = 29; i >= 0; i--) {
    // 1-2 reels per day, occasionally 0 or 3
    const postsToday = rng() < 0.1 ? 0 : rng() < 0.8 ? 1 : rng() < 0.95 ? 2 : 3
    for (let p = 0; p < postsToday; p++) {
      const platform = pick(rng, platforms)
      const category = pick(rng, categories)
      const title = pick(rng, reelTitles[category])

      // Base metrics vary by platform
      let views, likes, comments, shares, saves, reach
      const isBreakout = (i <= 16 && i >= 14 && p === 0) || (i === 8 && p === 0)

      if (platform === 'instagram') {
        views = randBetween(rng, 15000, 80000)
        if (isBreakout) views = randBetween(rng, 250000, 450000)
        likes = Math.round(views * (rng() * 0.04 + 0.03))
        comments = Math.round(views * (rng() * 0.008 + 0.002))
        shares = Math.round(views * (rng() * 0.015 + 0.005))
        saves = Math.round(views * (rng() * 0.012 + 0.003))
        reach = Math.round(views * (rng() * 0.3 + 0.6))
      } else if (platform === 'tiktok') {
        views = randBetween(rng, 10000, 120000)
        if (isBreakout) views = randBetween(rng, 400000, 800000)
        likes = Math.round(views * (rng() * 0.05 + 0.04))
        comments = Math.round(views * (rng() * 0.006 + 0.002))
        shares = Math.round(views * (rng() * 0.02 + 0.008))
        saves = Math.round(views * (rng() * 0.01 + 0.005))
        reach = Math.round(views * (rng() * 0.2 + 0.7))
      } else {
        views = randBetween(rng, 5000, 40000)
        if (isBreakout) views = randBetween(rng, 100000, 200000)
        likes = Math.round(views * (rng() * 0.03 + 0.02))
        comments = Math.round(views * (rng() * 0.005 + 0.001))
        shares = Math.round(views * (rng() * 0.025 + 0.01))
        saves = Math.round(views * (rng() * 0.005 + 0.002))
        reach = Math.round(views * (rng() * 0.25 + 0.5))
      }

      const watchTimePct = randBetween(rng, 35, 75)
      const hookRetention = randBetween(rng, 50, 90)
      const nonFollowerReachPct = randBetween(rng, 30, 70)
      const replays = Math.round(views * (rng() * 0.08 + 0.02))

      reels.push({
        id: `reel-${reelId++}`,
        title,
        platform,
        category,
        date: dateStr(i),
        views,
        likes,
        comments,
        shares,
        saves,
        reach,
        replays,
        watchTimePct,
        hookRetention,
        nonFollowerReachPct,
        isBreakout,
      })
    }
  }

  saveData(KEYS.REELS + 'all', reels)
}

// ---------------------------------------------------------------------------
// Competitors — 3 accounts with 30 days of follower history
// ---------------------------------------------------------------------------

function generateCompetitorData(rng) {
  const competitors = [
    {
      id: 'comp-1',
      name: 'Golden Floof',
      handle: '@goldenfloof',
      platform: 'instagram',
      avatar: null,
      bio: 'Golden Retriever living the dream',
    },
    {
      id: 'comp-2',
      name: 'Zoomie Zack',
      handle: '@zoomiezack',
      platform: 'instagram',
      avatar: null,
      bio: 'Husky with too much energy',
    },
    {
      id: 'comp-3',
      name: 'Puppy Paws',
      handle: '@puppypaws_',
      platform: 'tiktok',
      avatar: null,
      bio: 'Pomeranian taking over TikTok',
    },
  ]

  const history = {}

  // Golden Floof — 85K, established, slow growth
  let gf = 84200
  history['comp-1'] = []
  for (let i = 29; i >= 0; i--) {
    gf += randBetween(rng, 40, 90)
    history['comp-1'].push({
      date: dateStr(i),
      followers: gf,
      avgViews: randBetween(rng, 30000, 65000),
      engagementRate: +(rng() * 2 + 3).toFixed(2),
      postsThisWeek: i % 7 === 0 ? randBetween(rng, 4, 7) : null,
    })
  }

  // Zoomie Zack — 42K, fast growing rival
  let zz = 40500
  history['comp-2'] = []
  for (let i = 29; i >= 0; i--) {
    zz += randBetween(rng, 70, 180)
    history['comp-2'].push({
      date: dateStr(i),
      followers: zz,
      avgViews: randBetween(rng, 20000, 55000),
      engagementRate: +(rng() * 2.5 + 3.5).toFixed(2),
      postsThisWeek: i % 7 === 0 ? randBetween(rng, 5, 10) : null,
    })
  }

  // Puppy Paws — 120K TikTok-first
  let pp = 118000
  history['comp-3'] = []
  for (let i = 29; i >= 0; i--) {
    pp += randBetween(rng, 100, 350)
    history['comp-3'].push({
      date: dateStr(i),
      followers: pp,
      avgViews: randBetween(rng, 50000, 200000),
      engagementRate: +(rng() * 3 + 4).toFixed(2),
      postsThisWeek: i % 7 === 0 ? randBetween(rng, 6, 12) : null,
    })
  }

  saveData(KEYS.COMPETITORS + 'accounts', competitors)
  saveData(KEYS.COMPETITORS + 'history', history)
}

// ---------------------------------------------------------------------------
// Revenue — monthly totals + per-post brand deals
// ---------------------------------------------------------------------------

function generateRevenueData(rng) {
  const deals = [
    {
      id: 'deal-1',
      brand: 'BarkBox',
      date: dateStr(25),
      platform: 'instagram',
      amount: 850,
      type: 'Sponsorship',
      reelId: 'reel-3',
    },
    {
      id: 'deal-2',
      brand: 'Chewy',
      date: dateStr(18),
      platform: 'instagram',
      amount: 1200,
      type: 'Sponsorship',
      reelId: 'reel-12',
    },
    {
      id: 'deal-3',
      brand: 'PupJoy',
      date: dateStr(12),
      platform: 'tiktok',
      amount: 600,
      type: 'Sponsorship',
      reelId: 'reel-22',
    },
    {
      id: 'deal-4',
      brand: 'Furbo',
      date: dateStr(5),
      platform: 'instagram',
      amount: 1500,
      type: 'Sponsorship',
      reelId: 'reel-38',
    },
    {
      id: 'deal-5',
      brand: 'Wild One',
      date: dateStr(2),
      platform: 'tiktok',
      amount: 750,
      type: 'Sponsorship',
      reelId: 'reel-42',
    },
  ]

  const monthlyTotals = [
    { month: '2025-12', instagram: 2200, tiktok: 800, facebook: 150, total: 3150 },
    { month: '2026-01', instagram: 2800, tiktok: 1100, facebook: 200, total: 4100 },
    { month: '2026-02', instagram: 2400, tiktok: 950, facebook: 180, total: 3530 },
    {
      month: '2026-03',
      instagram: deals.filter((d) => d.platform === 'instagram').reduce((s, d) => s + d.amount, 0),
      tiktok: deals.filter((d) => d.platform === 'tiktok').reduce((s, d) => s + d.amount, 0),
      facebook: 120,
      total: deals.reduce((s, d) => s + d.amount, 0) + 120,
    },
  ]

  saveData(KEYS.REVENUE + 'deals', deals)
  saveData(KEYS.REVENUE + 'monthly', monthlyTotals)
}

// ---------------------------------------------------------------------------
// Calendar — scheduled + posted content for the current month
// ---------------------------------------------------------------------------

function generateCalendarData(rng) {
  const statuses = ['posted', 'posted', 'posted', 'ready', 'editing', 'filming', 'idea']
  const categories = ['tricks', 'day-in-life', 'funny', 'grooming', 'travel']
  const posts = []

  for (let i = 14; i >= -7; i--) {
    if (rng() < 0.3) continue // skip some days
    const status = i > 0 ? 'posted' : pick(rng, statuses)
    posts.push({
      id: `cal-${posts.length + 1}`,
      date: dateStr(i),
      time: pick(rng, ['09:00', '12:00', '15:00', '18:00', '20:00']),
      platforms: rng() > 0.4
        ? [pick(rng, ['instagram', 'tiktok', 'facebook'])]
        : ['instagram', 'tiktok'],
      category: pick(rng, categories),
      caption: '',
      hashtags: [],
      audioRef: null,
      status,
    })
  }

  saveData(KEYS.CALENDAR + 'posts', posts)
}

// ---------------------------------------------------------------------------
// Ideas bank
// ---------------------------------------------------------------------------

function generateIdeasData() {
  const ideas = [
    { id: 'idea-1', title: 'Milo reacts to puppy photos', category: 'funny', platform: 'tiktok', priority: 'hot', notes: 'Trending format right now', createdAt: dateStr(5) },
    { id: 'idea-2', title: 'Dog-friendly recipe series', category: 'day-in-life', platform: 'instagram', priority: 'warm', notes: 'Could be a weekly series', createdAt: dateStr(10) },
    { id: 'idea-3', title: 'Milo\'s morning stretching routine', category: 'funny', platform: 'tiktok', priority: 'hot', notes: 'Use trending yoga audio', createdAt: dateStr(3) },
    { id: 'idea-4', title: 'Before/after grooming timelapse', category: 'grooming', platform: 'instagram', priority: 'warm', notes: 'Good save-bait content', createdAt: dateStr(12) },
    { id: 'idea-5', title: 'Milo tries dog-safe ice cream', category: 'day-in-life', platform: 'instagram', priority: 'backlog', notes: 'Wait for summer', createdAt: dateStr(20) },
    { id: 'idea-6', title: 'Hiking trail vlog with Milo', category: 'travel', platform: 'tiktok', priority: 'warm', notes: 'Film next weekend', createdAt: dateStr(2) },
    { id: 'idea-7', title: 'Teach Milo to close the door', category: 'tricks', platform: 'instagram', priority: 'hot', notes: 'Training already started', createdAt: dateStr(1) },
    { id: 'idea-8', title: 'Dog park social hour compilation', category: 'funny', platform: 'facebook', priority: 'backlog', notes: '', createdAt: dateStr(15) },
  ]

  saveData(KEYS.IDEAS + 'bank', ideas)
}

// ---------------------------------------------------------------------------
// Hashtag sets
// ---------------------------------------------------------------------------

function generateHashtagData() {
  const sets = [
    { id: 'hs-1', name: 'Core Dog', tags: ['#dogsofinstagram', '#doglife', '#puppy', '#doglovers', '#instadog', '#doglover', '#dogs', '#dogstagram'] },
    { id: 'hs-2', name: 'Tricks & Training', tags: ['#dogtricks', '#dogtraining', '#smartdog', '#trickdog', '#doggoals', '#goodboy'] },
    { id: 'hs-3', name: 'Funny / Viral', tags: ['#funnydogs', '#dogmemes', '#dogsbeingdogs', '#dogcomedy', '#pethumor', '#funnyreels'] },
    { id: 'hs-4', name: 'Grooming & Care', tags: ['#doggrooming', '#dogspa', '#dogcare', '#groomingday', '#fluffydog', '#dogbath'] },
    { id: 'hs-5', name: 'Travel & Adventure', tags: ['#dogtravel', '#adventuredog', '#hikingwithdogs', '#dogfriendly', '#traveldog', '#explorewithdogs'] },
    { id: 'hs-6', name: 'Growth & Engagement', tags: ['#reels', '#explorepage', '#viral', '#trending', '#fyp', '#petinfluencer', '#doginfluencer'] },
  ]

  saveData(KEYS.HASHTAGS + 'sets', sets)
}

// ---------------------------------------------------------------------------
// Trending audio / sounds
// ---------------------------------------------------------------------------

function generateTrendsData(rng) {
  const trends = [
    { id: 'trend-1', name: 'Oh No — Kreepa', urgency: '24h', platform: 'tiktok', used: true, linkedPostId: 'reel-5', addedAt: dateStr(20) },
    { id: 'trend-2', name: 'Cute Aggression Sound', urgency: '3d', platform: 'instagram', used: true, linkedPostId: 'reel-15', addedAt: dateStr(14) },
    { id: 'trend-3', name: 'Sunshine — OneRepublic', urgency: '1w', platform: 'tiktok', used: false, linkedPostId: null, addedAt: dateStr(4) },
    { id: 'trend-4', name: 'Funny Walk Remix', urgency: '24h', platform: 'tiktok', used: false, linkedPostId: null, addedAt: dateStr(1) },
    { id: 'trend-5', name: 'Dog POV voiceover trend', urgency: '3d', platform: 'instagram', used: false, linkedPostId: null, addedAt: dateStr(2) },
    { id: 'trend-6', name: 'Before & After Glow Up Audio', urgency: '1w', platform: 'instagram', used: true, linkedPostId: 'reel-30', addedAt: dateStr(8) },
  ]

  saveData(KEYS.TRENDS + 'log', trends)
}

// ---------------------------------------------------------------------------
// Caption templates
// ---------------------------------------------------------------------------

function generateTemplatesData() {
  const templates = [
    { id: 'tpl-1', name: 'Trick Reveal', template: 'We\'ve been practicing this one for weeks... 🐾\n\nDrop a ❤️ if Milo nailed it!\n\n{hashtags}' },
    { id: 'tpl-2', name: 'Day in Life', template: 'Just another day in the life of Milo 🐶✨\n\n{hashtags}' },
    { id: 'tpl-3', name: 'Funny Moment', template: 'I can\'t with this dog 😂\n\nTag someone who needs to see this!\n\n{hashtags}' },
    { id: 'tpl-4', name: 'Grooming Day', template: 'Spa day for the good boy 🛁✨\n\nSwipe for the glow-up!\n\n{hashtags}' },
    { id: 'tpl-5', name: 'Brand Collab', template: 'Milo approved! 🐾 So excited to partner with @{brand} — use code MILO20 for 20% off!\n\n#ad #sponsored\n\n{hashtags}' },
  ]

  saveData(KEYS.TEMPLATES + 'captions', templates)
}
