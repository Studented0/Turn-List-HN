import { cookies } from 'next/headers'
import { createHash } from 'crypto'

// We store a SHA-256 hash of the passcode in the httpOnly cookie,
// never the raw value.
export function hashPasscode(passcode: string): string {
  return createHash('sha256').update(passcode).digest('hex')
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const passcode = process.env.ADMIN_PASSCODE
  if (!passcode) return false

  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  if (!session) return false

  return session.value === hashPasscode(passcode)
}
