'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './AudioSeekbar.module.css'
import { useCue, type YTPlayer } from './CueProvider'

export default function AudioSeekbar() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(NaN)
  const seekingRef = useRef(false)
  const ctx = useCue()
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  useEffect(() => {
    const audio = document.querySelector('audio')
    if (!audio) return
    audioRef.current = audio

    const adapter: YTPlayer = {
      playVideo: () => { audio.play().catch(() => {}) },
      pauseVideo: () => audio.pause(),
      seekTo: (s: number) => { audio.currentTime = s },
      getCurrentTime: () => audio.currentTime,
    }
    ctxRef.current?.setPlayer(adapter)

    const onTimeUpdate = () => {
      if (!seekingRef.current) setCurrentTime(audio.currentTime)
    }
    const onLoaded = () => setDuration(audio.duration)
    const onDurationChange = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('durationchange', onDurationChange)

    if (!isNaN(audio.duration)) setDuration(audio.duration)
    setCurrentTime(audio.currentTime)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('durationchange', onDurationChange)
    }
  }, [])

  if (!isFinite(duration) || duration <= 0) return null

  const progress = currentTime / duration

  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = e.currentTarget.valueAsNumber
    setCurrentTime(val)
    if (audioRef.current) audioRef.current.currentTime = val
  }

  return (
    <div className={styles.wrap}>
      <input
        type="range"
        className={styles.seek}
        min={0}
        max={duration}
        step={0.01}
        value={currentTime}
        onPointerDown={(e) => {
          seekingRef.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerUp={() => { seekingRef.current = false }}
        onPointerCancel={() => { seekingRef.current = false }}
        onInput={onInput}
        onChange={onInput}
        aria-label="오디오 재생 위치"
        style={{ '--p': progress } as React.CSSProperties}
      />
    </div>
  )
}
