'use client'

import { useMemo } from 'react'
import * as runtime from 'react/jsx-runtime'
import YouTubeEmbed from './YouTubeEmbed'
import Cue from './Cue'
import Chapter from './Chapter'

const components = { YouTubeEmbed, Cue, Chapter }

type Props = {
  code: string
}

export function MDXContent({ code }: Props) {
  const Component = useMemo(() => {
    const fn = new Function(code)
    return fn({ ...runtime }).default
  }, [code])

  return <Component components={components} />
}
