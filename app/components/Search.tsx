'use client'

import { useState, useEffect } from 'react'
import SearchBox from './SearchBox'
import { useHideOnScroll } from './useHideOnScroll'
import fabStyles from './Fab.module.css'
import styles from './Search.module.css'

export default function Search() {
  const visible = useHideOnScroll()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || !e.ctrlKey) return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      setOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        className={`${fabStyles.fab} ${styles.search} ${visible ? '' : fabStyles.fabHidden}`}
        onClick={() => setOpen(true)}
        aria-label="검색"
        title="검색  (Ctrl+/)"
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && <SearchBox overlayMode onClose={() => setOpen(false)} />}
    </>
  )
}
