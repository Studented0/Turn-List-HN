'use client'

import { useEffect, useState } from 'react'

export function DarkModeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Render an invisible placeholder pre-hydration to avoid layout shift
  if (!mounted) return <span className="w-8 inline-block" />

  return (
    <button
      onClick={toggle}
      className="text-sm hover:underline"
      aria-label="Toggle dark mode"
    >
      {dark ? 'Light' : 'Dark'}
    </button>
  )
}
