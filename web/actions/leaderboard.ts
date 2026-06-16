'use server'

import { readDb } from '@/lib/db'

export type LeaderboardEntry = {
  id: string
  nickname: string | null
  weight: number
}

export async function getLeaderboard(): Promise<{
  data: LeaderboardEntry[]
  error?: string
}> {
  try {
    const { profiles } = readDb()
    const sorted = [...profiles]
      .sort((a, b) => a.weight - b.weight)
      .map(({ id, nickname, weight }) => ({ id, nickname, weight }))
    return { data: sorted }
  } catch {
    return { data: [], error: 'Failed to read leaderboard data' }
  }
}
