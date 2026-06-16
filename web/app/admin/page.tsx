'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  checkAdminSession,
  createProfile,
  deleteProfile,
  getProfiles,
  resetAllData,
  updateNickname,
  updateProfileId,
  verifyPasscode,
  type Profile,
} from '@/actions/admin'

export default function AdminPage() {
  // Auth
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState<string | null>(null)

  // Data
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [idEdits, setIdEdits] = useState<Record<string, string>>({})
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [rowSaved, setRowSaved] = useState<Record<string, boolean>>({})

  // Create
  const [newId, setNewId] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createMsg, setCreateMsg] = useState<string | null>(null)

  // Delete (per-row two-step confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Reset
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)
  const resetCancelRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    checkAdminSession().then((authed) => {
      setAuthenticated(authed)
      setChecking(false)
      if (authed) loadProfiles()
    })
  }, [])

  async function loadProfiles() {
    const result = await getProfiles()
    if (result.success) {
      setProfiles(result.data)
      const idMap: Record<string, string> = {}
      const nickMap: Record<string, string> = {}
      result.data.forEach((p) => {
        idMap[p.id] = p.id
        nickMap[p.id] = p.nickname ?? ''
      })
      setIdEdits(idMap)
      setNicknames(nickMap)
      setRowErrors({})
    }
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasscodeError(null)
    startTransition(async () => {
      const result = await verifyPasscode(passcode)
      if (result.success) {
        setAuthenticated(true)
        setPasscode('')
        await loadProfiles()
      } else {
        setPasscodeError(result.error ?? 'Invalid passcode')
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateMsg(null)
    startTransition(async () => {
      const result = await createProfile(newId)
      if (result.success) {
        setNewId('')
        setCreateMsg('Created')
        await loadProfiles()
        setTimeout(() => setCreateMsg(null), 3000)
      } else {
        setCreateError(result.error ?? 'Failed')
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Row save: commits an ID rename (if changed), then the nickname
  // ---------------------------------------------------------------------------

  function handleRowSave(originalId: string) {
    const newIdValue = (idEdits[originalId] ?? originalId).trim()
    const nickname = nicknames[originalId] ?? ''

    setRowErrors((prev) => ({ ...prev, [originalId]: '' }))

    startTransition(async () => {
      let targetId = originalId

      if (newIdValue !== originalId) {
        if (!/^\d{4}$/.test(newIdValue)) {
          setRowErrors((prev) => ({ ...prev, [originalId]: 'ID must be exactly 4 digits' }))
          return
        }
        const idResult = await updateProfileId(originalId, newIdValue)
        if (!idResult.success) {
          setRowErrors((prev) => ({ ...prev, [originalId]: idResult.error ?? 'Failed to update ID' }))
          return
        }
        targetId = newIdValue
      }

      const nickResult = await updateNickname(targetId, nickname)
      if (!nickResult.success) {
        setRowErrors((prev) => ({ ...prev, [originalId]: nickResult.error ?? 'Failed to update nickname' }))
        return
      }

      setRowSaved((prev) => ({ ...prev, [originalId]: true }))
      setTimeout(() => setRowSaved((prev) => ({ ...prev, [originalId]: false })), 2000)
      await loadProfiles()
    })
  }

  // ---------------------------------------------------------------------------
  // Delete (two-step: first click arms, second click fires)
  // ---------------------------------------------------------------------------

  function handleDeleteClick(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setConfirmDeleteId(null)
    startTransition(async () => {
      await deleteProfile(id)
      await loadProfiles()
    })
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  function handleResetClick() {
    if (!resetConfirm) {
      setResetConfirm(true)
      if (resetCancelRef.current) clearTimeout(resetCancelRef.current)
      resetCancelRef.current = setTimeout(() => setResetConfirm(false), 8000)
      return
    }
    if (resetCancelRef.current) clearTimeout(resetCancelRef.current)
    setResetConfirm(false)
    startTransition(async () => {
      const result = await resetAllData()
      if (result.success) {
        setResetMsg('All data reset')
        await loadProfiles()
        setTimeout(() => setResetMsg(null), 3000)
      } else {
        setResetMsg(result.error ?? 'Reset failed')
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (checking) {
    return <p className="text-sm">Loading...</p>
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <form onSubmit={handlePasscodeSubmit} className="w-full max-w-xs space-y-4">
          <label htmlFor="passcode" className="block text-sm">
            Admin Passcode
          </label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoComplete="off"
            className="w-full border border-black dark:border-white px-3 py-2 text-sm bg-white dark:bg-black dark:text-white"
          />
          {passcodeError && <p className="text-sm">{passcodeError}</p>}
          <button
            type="submit"
            disabled={isPending || !passcode}
            className="w-full border border-black dark:border-white px-4 py-2 text-sm disabled:opacity-30"
          >
            {isPending ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <h1 className="text-sm border-b border-black dark:border-white pb-2">Admin</h1>

      {/* Create ID */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold">Create ID</h2>
        <form onSubmit={handleCreateProfile} className="flex flex-wrap gap-2 items-start">
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={newId}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4)
              setNewId(val)
              setCreateError(null)
            }}
            placeholder="0000"
            className="border border-black dark:border-white px-3 py-2 text-sm bg-white dark:bg-black dark:text-white w-24"
          />
          <button
            type="submit"
            disabled={isPending || newId.length !== 4}
            className="border border-black dark:border-white px-4 py-2 text-sm disabled:opacity-30"
          >
            Create
          </button>
          {createError && <p className="w-full text-sm">{createError}</p>}
          {createMsg && <p className="w-full text-sm">{createMsg}</p>}
        </form>
      </section>

      {/* IDs / Nicknames / Delete */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold">Manage IDs</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No profiles yet.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: '380px' }}>
              <thead>
                <tr className="border-b border-black dark:border-white">
                  <th className="text-left py-2 pr-4 font-normal">ID</th>
                  <th className="text-left py-2 pr-4 font-normal">Nickname</th>
                  <th className="py-2 pr-3 font-normal" />
                  <th className="py-2 font-normal" />
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-gray-200 dark:border-neutral-800 align-top"
                  >
                    <td className="py-2 pr-4">
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={4}
                        value={idEdits[profile.id] ?? profile.id}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setIdEdits((prev) => ({ ...prev, [profile.id]: val }))
                          setRowErrors((prev) => ({ ...prev, [profile.id]: '' }))
                        }}
                        className="border border-gray-400 dark:border-neutral-600 px-2 py-1 text-sm bg-white dark:bg-black dark:text-white w-20"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        value={nicknames[profile.id] ?? ''}
                        onChange={(e) =>
                          setNicknames((prev) => ({ ...prev, [profile.id]: e.target.value }))
                        }
                        placeholder="—"
                        className="border border-gray-400 dark:border-neutral-600 px-2 py-1 text-sm bg-white dark:bg-black dark:text-white w-full max-w-[160px]"
                      />
                    </td>
                    {/* Save */}
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => handleRowSave(profile.id)}
                        disabled={isPending}
                        className="border border-black dark:border-white px-3 py-1 text-xs disabled:opacity-30"
                      >
                        Save
                      </button>
                      {rowSaved[profile.id] && <p className="text-xs mt-1">Saved</p>}
                      {rowErrors[profile.id] && (
                        <p className="text-xs mt-1">{rowErrors[profile.id]}</p>
                      )}
                    </td>
                    {/* Delete (two-step) */}
                    <td className="py-2">
                      {confirmDeleteId === profile.id ? (
                        <span className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(profile.id)}
                            disabled={isPending}
                            className="border border-red-600 text-red-600 px-2 py-1 text-xs disabled:opacity-30"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="border border-black dark:border-white px-2 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(profile.id)}
                          disabled={isPending}
                          className="border border-red-600 text-red-600 px-3 py-1 text-xs disabled:opacity-30"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reset Data */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold">Reset Data</h2>
        <button
          type="button"
          onClick={handleResetClick}
          disabled={isPending}
          className={`border px-4 py-2 text-sm disabled:opacity-30 transition-none ${
            resetConfirm
              ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
              : 'bg-white text-black border-black dark:bg-black dark:text-white dark:border-white'
          }`}
        >
          {resetConfirm
            ? 'Are you absolutely sure? Click again to confirm'
            : 'Reset All Input Data'}
        </button>
        {resetMsg && <p className="text-sm">{resetMsg}</p>}
      </section>
    </div>
  )
}
