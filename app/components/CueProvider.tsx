'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (s: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
}

type CueEntry = { id: string; time: number; el: HTMLElement }
export type ChapterEntry = { id: string; time: number; label: string; title: string; el: HTMLElement }

type CueContextValue = {
  registerCue: (id: string, time: number, el: HTMLElement) => void
  unregisterCue: (id: string) => void
  setPlayer: (p: YTPlayer) => void
  jump: (seconds: number) => void
  activeCueId: string | null
  registerChapter: (id: string, time: number, label: string, title: string, el: HTMLElement) => void
  unregisterChapter: (id: string) => void
  activeChapterId: string | null
  chapters: ChapterEntry[]
}

const CueContext = createContext<CueContextValue | null>(null)

export function useCue() {
  return useContext(CueContext)
}

export function CueProvider({ children }: { children: React.ReactNode }) {
  const cuesRef = useRef<Map<string, CueEntry>>(new Map())
  const chaptersRef = useRef<Map<string, ChapterEntry>>(new Map())
  const playerRef = useRef<YTPlayer | null>(null)
  const autoScrollRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
  const [activeCueId, setActiveCueId] = useState<string | null>(null)
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<ChapterEntry[]>([])
  const [hasPlayer, setHasPlayer] = useState(false)
  const prevActiveCueIdRef = useRef<string | null>(null)

  const registerCue = useCallback((id: string, time: number, el: HTMLElement) => {
    cuesRef.current.set(id, { id, time, el })
  }, [])
  const unregisterCue = useCallback((id: string) => {
    cuesRef.current.delete(id)
  }, [])

  const registerChapter = useCallback((id: string, time: number, label: string, title: string, el: HTMLElement) => {
    const entry: ChapterEntry = { id, time, label, title, el }
    chaptersRef.current.set(id, entry)
    setChapters([...chaptersRef.current.values()].sort((a, b) => a.time - b.time))
  }, [])
  const unregisterChapter = useCallback((id: string) => {
    chaptersRef.current.delete(id)
    setChapters([...chaptersRef.current.values()].sort((a, b) => a.time - b.time))
  }, [])

  const setPlayer = useCallback((p: YTPlayer) => {
    playerRef.current = p
    autoScrollRef.current = true
    setHasPlayer(true)
    if (pendingSeekRef.current != null) {
      p.seekTo(pendingSeekRef.current, true)
      p.playVideo()
      pendingSeekRef.current = null
    }
  }, [])

  const jump = useCallback((seconds: number) => {
    autoScrollRef.current = true
    const p = playerRef.current
    if (p) {
      p.seekTo(seconds, true)
      p.playVideo()
    } else {
      const lite = document.querySelector('lite-youtube') as HTMLElement | null
      if (!lite) return
      pendingSeekRef.current = seconds
      lite.click()
    }
  }, [])

  useEffect(() => {
    if (!hasPlayer) return
    const id = setInterval(() => {
      const p = playerRef.current
      if (!p) return
      const t = p.getCurrentTime()

      let activeCue: CueEntry | null = null
      for (const c of cuesRef.current.values()) {
        if (c.time <= t && (!activeCue || c.time > activeCue.time)) activeCue = c
      }
      const newCueId = activeCue?.id ?? null
      if (newCueId !== prevActiveCueIdRef.current) {
        prevActiveCueIdRef.current = newCueId
        setActiveCueId(newCueId)
        if (newCueId && autoScrollRef.current && activeCue) {
          activeCue.el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }

      let activeChapter: ChapterEntry | null = null
      for (const c of chaptersRef.current.values()) {
        if (c.time <= t && (!activeChapter || c.time > activeChapter.time)) activeChapter = c
      }
      setActiveChapterId(activeChapter?.id ?? null)
    }, 250)
    return () => clearInterval(id)
  }, [hasPlayer])

  useEffect(() => {
    const off = () => { autoScrollRef.current = false }
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
        autoScrollRef.current = false
      }
    }
    window.addEventListener('wheel', off, { passive: true })
    window.addEventListener('touchmove', off, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', off)
      window.removeEventListener('touchmove', off)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const value = useMemo(() => ({
    registerCue, unregisterCue, setPlayer, jump, activeCueId,
    registerChapter, unregisterChapter, activeChapterId, chapters,
  }), [registerCue, unregisterCue, setPlayer, jump, activeCueId,
    registerChapter, unregisterChapter, activeChapterId, chapters])

  return (
    <CueContext.Provider value={value}>
      {children}
    </CueContext.Provider>
  )
}
