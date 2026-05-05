'use client'

import { useEffect, useId, useRef } from 'react'
import { useCue } from './CueProvider'
import styles from './Cue.module.css'

type Props = {
  time: string
  label: string
  children: React.ReactNode
}

export default function Cue({ time, label, children }: Props) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useCue()
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const seconds = Number(time) || 0

  useEffect(() => {
    const c = ctxRef.current
    if (!c || !ref.current) return
    c.registerCue(id, seconds, ref.current)
    return () => c.unregisterCue(id)
  }, [id, seconds])

  const isActive = ctx?.activeCueId === id

  return (
    <div ref={ref} className={`${styles.cue} ${isActive ? styles.active : ''}`}>
      <div className={styles.chipRow}>
        <button
          type="button"
          className={styles.chip}
          onClick={() => {
            ctx?.jump(seconds)
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
          aria-label={`${label}로 이동`}
        >
          <span aria-hidden>▶</span>
          <span>{label}</span>
        </button>
      </div>
      {children}
    </div>
  )
}
