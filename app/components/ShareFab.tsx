'use client'

import { useState, useCallback } from 'react'
import { useHideOnScroll } from './useHideOnScroll'
import fabStyles from './Fab.module.css'
import styles from './ShareFab.module.css'

export default function ShareFab() {
  const visible = useHideOnScroll()
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ url }) } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  return (
    <button
      className={`${fabStyles.fab} ${styles.share} ${visible ? '' : fabStyles.fabHidden}`}
      onClick={handleShare}
      aria-label="링크 공유"
      title="링크 공유"
    >
      {copied ? (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <polyline points="4,10 8,14 16,6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 11v4a1 1 0 001 1h8a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
