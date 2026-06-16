'use server'

import { cookies } from 'next/headers'
import { readDb, writeDb, type Profile } from '@/lib/db'
import { isAdminAuthenticated, hashPasscode } from '@/lib/session'

export type { Profile }

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function verifyPasscode(
  passcode: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.ADMIN_PASSCODE) {
    return { success: false, error: 'Admin passcode is not configured' }
  }
  if (passcode !== process.env.ADMIN_PASSCODE) {
    return { success: false, error: 'Invalid passcode' }
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', hashPasscode(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
  return { success: true }
}

export async function checkAdminSession(): Promise<boolean> {
  return isAdminAuthenticated()
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export async function getProfiles(): Promise<{
  success: boolean
  data: Profile[]
  error?: string
}> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, data: [], error: 'Unauthorized' }
  }
  const { profiles } = readDb()
  const sorted = [...profiles].sort((a, b) => a.id.localeCompare(b.id))
  return { success: true, data: sorted }
}

export async function createProfile(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: 'Unauthorized' }
  }
  if (!/^\d{4}$/.test(id)) {
    return { success: false, error: 'ID must be exactly 4 digits' }
  }

  const db = readDb()
  if (db.profiles.some((p) => p.id === id)) {
    return { success: false, error: 'ID already exists' }
  }

  db.profiles.push({ id, nickname: null, weight: 0 })
  await writeDb(db)
  return { success: true }
}

export async function updateNickname(
  id: string,
  nickname: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: 'Unauthorized' }
  }

  const db = readDb()
  const profile = db.profiles.find((p) => p.id === id)
  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  profile.nickname = nickname.trim() || null
  await writeDb(db)
  return { success: true }
}

export async function updateProfileId(
  oldId: string,
  newId: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: 'Unauthorized' }
  }
  if (!/^\d{4}$/.test(newId)) {
    return { success: false, error: 'ID must be exactly 4 digits' }
  }
  if (newId === oldId) {
    return { success: true }
  }

  const db = readDb()
  const profile = db.profiles.find((p) => p.id === oldId)
  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }
  if (db.profiles.some((p) => p.id === newId)) {
    return { success: false, error: 'ID already exists' }
  }

  profile.id = newId
  db.inputs.forEach((i) => {
    if (i.profile_id === oldId) i.profile_id = newId
  })
  await writeDb(db)
  return { success: true }
}

export async function deleteProfile(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: 'Unauthorized' }
  }

  const db = readDb()
  const index = db.profiles.findIndex((p) => p.id === id)
  if (index === -1) {
    return { success: false, error: 'Profile not found' }
  }

  db.profiles.splice(index, 1)
  db.inputs = db.inputs.filter((i) => i.profile_id !== id)
  await writeDb(db)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Destructive reset
// ---------------------------------------------------------------------------

export async function resetAllData(): Promise<{
  success: boolean
  error?: string
}> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: 'Unauthorized' }
  }

  const db = readDb()
  db.inputs = []
  db.profiles.forEach((p) => (p.weight = 0))
  await writeDb(db)
  return { success: true }
}
