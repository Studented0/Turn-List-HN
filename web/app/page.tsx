'use client'

import { useRef, useState } from 'react'
import { validateProfileId, submitInput } from '@/actions/input'

export default function InputPage() {
  const [idValue, setIdValue] = useState('')
  const [numValue, setNumValue] = useState('')

  const [idError, setIdError] = useState<string | null>(null)
  const [idValid, setIdValid] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkGenRef = useRef(0)

  async function checkId(id: string) {
    if (id.length !== 4) {
      setIdError('ID must be exactly 4 digits')
      setIdValid(false)
      setIsValidating(false)
      return
    }
    const gen = ++checkGenRef.current
    setIsValidating(true)
    setIdError(null)
    try {
      const { exists } = await validateProfileId(id)
      if (gen !== checkGenRef.current) return // stale — user has since changed the field
      if (exists) {
        setIdValid(true)
      } else {
        setIdValid(false)
        setIdError('ID not found')
      }
    } catch {
      if (gen !== checkGenRef.current) return
      setIdValid(false)
      setIdError('Validation failed')
    } finally {
      if (gen === checkGenRef.current) setIsValidating(false)
    }
  }

  function handleIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setIdValue(val)
    setIdValid(false)
    setIdError(null)
    checkGenRef.current++ // invalidate any in-flight check

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.length === 4) {
      debounceRef.current = setTimeout(() => checkId(val), 350)
    }
  }

  function handleIdBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (idValue.length > 0) checkId(idValue)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idValid || !numValue || isSubmitting) return

    const parsed = parseFloat(numValue)
    if (!isFinite(parsed)) return

    setIsSubmitting(true)
    setSubmitError(null)
    setSuccess(false)

    try {
      const result = await submitInput(idValue, parsed)
      if (result.success) {
        setIdValue('')
        setNumValue('')
        setIdValid(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setSubmitError(result.error ?? 'Submission failed')
      }
    } catch {
      setSubmitError('Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = idValid && numValue !== '' && !isSubmitting

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs space-y-6"
        noValidate
      >
        <div className="space-y-1">
          <label htmlFor="id" className="block text-sm">
            Số Định Danh
          </label>
          <input
            id="id"
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={idValue}
            onChange={handleIdChange}
            onBlur={handleIdBlur}
            placeholder="0000"
            autoComplete="off"
            className="w-full border border-black dark:border-white px-3 py-2 text-sm bg-white dark:bg-black dark:text-white"
          />
          {isValidating && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Checking...</p>
          )}
          {idError && <p className="text-xs">{idError}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="value" className="block text-sm">
            Nhập Số
          </label>
          <input
            id="value"
            type="number"
            step="any"
            value={numValue}
            onChange={(e) => setNumValue(e.target.value)}
            placeholder="0"
            className="w-full border border-black dark:border-white px-3 py-2 text-sm bg-white dark:bg-black dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full border border-black dark:border-white px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>

        {success && <p className="text-sm text-center">Success</p>}
        {submitError && <p className="text-sm text-center">{submitError}</p>}
      </form>
    </div>
  )
}
