import { useMemo } from 'react'
import { getData, KEYS } from '../utils/storage'
import KpiCards from '../components/KpiCards'
import FollowerChart from '../components/FollowerChart'
import ViewsChart from '../components/ViewsChart'
import EngagementChart from '../components/EngagementChart'
import ReachPieChart from '../components/ReachPieChart'
import ContentTable from '../components/ContentTable'
import RevenueMinChart from '../components/RevenueMinChart'
import PostingHeatmap from '../components/PostingHeatmap'

export default function Overview({ dateRange }) {
  const data = useMemo(() => {
    const followers = getData(KEYS.FOLLOWERS + 'daily') || []
    const reels = getData(KEYS.REELS + 'all') || []
    const revenue = getData(KEYS.REVENUE + 'monthly') || []
    const deals = getData(KEYS.REVENUE + 'deals') || []

    const cutoff = dateRange > 0 ? followers.length - dateRange : 0
    const filteredFollowers = followers.slice(Math.max(0, cutoff))
    const filteredReels = dateRange > 0
      ? reels.filter((r) => {
          const d = new Date(r.date)
          const ago = new Date()
          ago.setDate(ago.getDate() - dateRange)
          return d >= ago
        })
      : reels

    return { followers: filteredFollowers, allFollowers: followers, reels: filteredReels, allReels: reels, revenue, deals }
  }, [dateRange])

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <KpiCards data={data} />

      {/* Row 2: Follower Growth + Views Per Reel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FollowerChart followers={data.followers} />
        <ViewsChart reels={data.reels} />
      </div>

      {/* Row 3: Engagement Breakdown + Reach Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngagementChart reels={data.reels} />
        <ReachPieChart reels={data.reels} />
      </div>

      {/* Row 4: Content Performance Table */}
      <ContentTable reels={data.reels} />

      {/* Row 5: Revenue Tracker + Posting Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueMinChart revenue={data.revenue} />
        <PostingHeatmap reels={data.allReels} />
      </div>
    </div>
  )
}
