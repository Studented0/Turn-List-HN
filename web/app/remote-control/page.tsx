'use client'

import { useCallback, useEffect, useState } from 'react'
import { getLeaderboard, type LeaderboardEntry } from '@/actions/leaderboard'

const REFRESH_MS = 15_000

export default function RemoteControlPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)

  const refresh = useCallback(async () => {
    const result = await getLeaderboard()
    if (result.error) {
      setError(result.error)
    } else {
      setData(result.data)
      setUpdatedAt(new Date())
      setCountdown(REFRESH_MS / 1000)
      setError(null)
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    refresh()
    const poll = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(poll)
  }, [refresh])

  // Countdown display
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  function goFullScreen() {
    document.documentElement.requestFullscreen().catch(() => {})
  }

  const positiveWeights = data.map((e) => e.weight).filter((w) => w > 0)
  const minWeight = positiveWeights.length > 0 ? Math.min(...positiveWeights) : null

  return (
    <div>
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-sm border-b border-black dark:border-white pb-2 flex-1">
          Turn List / Danh Sách Lượt
        </h1>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {updatedAt && (
            <span>
              Updated {updatedAt.toLocaleTimeString()} &mdash; refreshing in {countdown}s
            </span>
          )}
          <button
            onClick={goFullScreen}
            className="border border-black dark:border-white px-3 py-1 text-xs hover:underline"
          >
            Full Screen
          </button>
        </div>
      </div>

      {error && <p className="text-sm mb-4">{error}</p>}

      {data.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {updatedAt ? 'No entries yet.' : 'Loading...'}
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '280px' }}>
            <thead>
              <tr className="border-b border-black dark:border-white">
                <th className="text-left py-3 pr-8 font-normal text-lg">#</th>
                <th className="text-left py-3 pr-8 font-normal text-lg">Name</th>
                <th className="text-right py-3 font-normal text-lg">Weight</th>
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
                    <td className="py-4 pr-8 text-2xl">{index + 1}</td>
                    <td className="py-4 pr-8 text-2xl">{entry.nickname ?? entry.id}</td>
                    <td className="py-4 text-right text-2xl">{entry.weight}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
