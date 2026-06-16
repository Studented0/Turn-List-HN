'use server'

import { randomUUID } from 'crypto'
import { readDb, writeDb } from '@/lib/db'

export async function validateProfileId(id: string): Promise<{ exists: boolean }> {
  if (!/^\d{4}$/.test(id)) return { exists: false }
  const { profiles } = readDb()
  return { exists: profiles.some((p) => p.id === id) }
}

export async function submitInput(
  profileId: string,
  value: number
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}$/.test(profileId)) {
    return { success: false, error: 'Invalid ID format' }
  }
  if (!isFinite(value)) {
    return { success: false, error: 'Invalid number' }
  }

  const db = readDb()
  const profile = db.profiles.find((p) => p.id === profileId)
  if (!profile) {
    return { success: false, error: 'ID not found' }
  }

  // Append the new input row
  db.inputs.push({
    id: randomUUID(),
    profile_id: profileId,
    value,
    created_at: new Date().toISOString(),
  })

  // Recalculate weight: round(sum of all values for this profile / 15)
  const sum = db.inputs
    .filter((i) => i.profile_id === profileId)
    .reduce((acc, i) => acc + i.value, 0)
  profile.weight = Math.round(sum / 15)

  await writeDb(db)
  return { success: true }
}
