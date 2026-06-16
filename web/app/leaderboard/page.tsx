'use client'

import { useCallback, useEffect, useState } from 'react'
import { getLeaderboard, type LeaderboardEntry } from '@/actions/leaderboard'

const REFRESH_MS = 5_000

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const result = await getLeaderboard()
    if (result.error) {
      setError(result.error)
    } else {
      setData(result.data)
      setError(null)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
    const poll = setInterval(refresh, REFRESH_MS)

    // Refetch immediately when the tab regains focus/visibility
    function handleVisibility() {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh])

  const heading = (
    <h1 className="text-sm mb-6 border-b border-black dark:border-white pb-2">
      Danh Sách Lượt
    </h1>
  )

  if (error) {
    return (
      <div>
        {heading}
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div>
        {heading}
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div>
        {heading}
        <p className="text-sm text-gray-500 dark:text-gray-400">No entries yet.</p>
      </div>
    )
  }

  const positiveWeights = data.map((e) => e.weight).filter((w) => w > 0)
  const minWeight = positiveWeights.length > 0 ? Math.min(...positiveWeights) : null

  return (
    <div>
      {heading}

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: '280px' }}>
          <thead>
            <tr className="border-b border-black dark:border-white">
              <th className="text-left py-2 pr-6 font-normal">#</th>
              <th className="text-left py-2 pr-6 font-normal">Name</th>
              <th className="text-right py-2 font-normal">Weight</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => {
              const isLeader = minWeight !== null && entry.weight === minWeight
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-gray-200 dark:border-neutral-800 ${
                    isLeader ? 'bg-[#e5e7eb] dark:bg-neutral-800' : ''
                  }`}
                >
                  <td className="py-2 pr-6">{index + 1}</td>
                  <td className="py-2 pr-6">{entry.nickname ?? entry.id}</td>
                  <td className="py-2 text-right">{entry.weight}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
