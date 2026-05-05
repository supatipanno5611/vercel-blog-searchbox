'use client'

import { useEffect, useRef } from 'react'
import 'lite-youtube-embed/src/lite-yt-embed.css'
import { useCue, type YTPlayer } from './CueProvider'
import styles from './YouTubeEmbed.module.css'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lite-youtube': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        videoid?: string
        params?: string
        'js-api'?: string
      }
    }
  }
}

type LiteYouTubeElement = HTMLElement & {
  getYTPlayer: () => Promise<YTPlayer>
}

export default function YouTubeEmbed({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useCue()
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  useEffect(() => {
    void import('lite-youtube-embed')
  }, [])

  useEffect(() => {
    if (!ref.current) return
    const lite = ref.current.querySelector('lite-youtube') as LiteYouTubeElement | null
    if (!lite) return

    const handleActivate = async () => {
      const player = await lite.getYTPlayer()
      ctxRef.current?.setPlayer(player)
    }

    lite.addEventListener('click', handleActivate, { once: true })
    return () => lite.removeEventListener('click', handleActivate)
  }, [])

  return (
    <div ref={ref} className={styles.sticky}>
      <lite-youtube videoid={id} params="enablejsapi=1&playsinline=1" js-api="" />
    </div>
  )
}
