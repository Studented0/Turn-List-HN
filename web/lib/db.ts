import * as XLSX from 'xlsx'
import * as fs from 'fs'
import path from 'path'

export const DB_PATH = path.join(process.cwd(), 'data', 'database.xlsx')

// Column header rows kept even when sheets are empty so the XLSX file
// remains readable in Excel/LibreOffice without any row being present.
const PROFILE_HEADERS = [['id', 'nickname', 'weight']]
const INPUT_HEADERS = [['id', 'profile_id', 'value', 'created_at']]

export type Profile = {
  id: string
  nickname: string | null
  weight: number
}

export type InputRow = {
  id: string
  profile_id: string
  value: number
  created_at: string
}

type DB = {
  profiles: Profile[]
  inputs: InputRow[]
}

function ensureFile() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DB_PATH)) {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(PROFILE_HEADERS),
      'profiles'
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(INPUT_HEADERS),
      'inputs'
    )
    XLSX.writeFile(wb, DB_PATH)
  }
}

export function readDb(): DB {
  ensureFile()
  const wb = XLSX.readFile(DB_PATH)

  const rawProfiles: Record<string, unknown>[] = wb.Sheets['profiles']
    ? XLSX.utils.sheet_to_json(wb.Sheets['profiles'], { defval: null })
    : []

  const rawInputs: Record<string, unknown>[] = wb.Sheets['inputs']
    ? XLSX.utils.sheet_to_json(wb.Sheets['inputs'], { defval: null })
    : []

  return {
    profiles: rawProfiles.map((row) => ({
      id: String(row['id'] ?? ''),
      nickname:
        row['nickname'] != null && row['nickname'] !== ''
          ? String(row['nickname'])
          : null,
      weight: Number(row['weight'] ?? 0),
    })),
    inputs: rawInputs.map((row) => ({
      id: String(row['id'] ?? ''),
      profile_id: String(row['profile_id'] ?? ''),
      value: Number(row['value'] ?? 0),
      created_at: String(row['created_at'] ?? new Date().toISOString()),
    })),
  }
}

// Serialise all writes so concurrent requests can't interleave their
// read-modify-write cycles and overwrite each other's data.
let writeQueue: Promise<void> = Promise.resolve()

export function writeDb(db: DB): Promise<void> {
  const next = writeQueue.then(() => {
    ensureFile()
    const wb = XLSX.utils.book_new()

    // Always emit headers; use json_to_sheet only when there are rows to avoid
    // losing column order on an empty array.
    const profileSheet =
      db.profiles.length > 0
        ? XLSX.utils.json_to_sheet(db.profiles)
        : XLSX.utils.aoa_to_sheet(PROFILE_HEADERS)

    const inputSheet =
      db.inputs.length > 0
        ? XLSX.utils.json_to_sheet(db.inputs)
        : XLSX.utils.aoa_to_sheet(INPUT_HEADERS)

    XLSX.utils.book_append_sheet(wb, profileSheet, 'profiles')
    XLSX.utils.book_append_sheet(wb, inputSheet, 'inputs')
    XLSX.writeFile(wb, DB_PATH)
  })
  // Keep the queue moving even if this write throws.
  writeQueue = next.catch(() => {})
  return next
}
