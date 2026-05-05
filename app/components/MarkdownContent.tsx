'use client'

import ReactMarkdown, { defaultUrlTransform, type Components, type UrlTransform } from 'react-markdown'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import { isSafeHref } from '@/lib/markdown-security'
import { remarkCallout } from '@/lib/remark-callout'
import { remarkChapter } from '@/lib/remark-chapter'
import { remarkCue } from '@/lib/remark-cue'
import { remarkDirectiveEmbeds } from '@/lib/remark-directive-embeds'
import { remarkMark } from '@/lib/remark-mark'
import { remarkMarkdownOnly } from '@/lib/remark-markdown-only'
import { remarkWikiLink } from '@/lib/remark-wiki-link'
import Chapter from './Chapter'
import Cue from './Cue'
import YouTubeEmbed from './YouTubeEmbed'

type Props = {
  source: string
}

const components = {
  youtube({ id }: { id?: string }) {
    return id ? <YouTubeEmbed id={id} /> : null
  },
  cue({ time, label, children }: { time?: string; label?: string; children?: React.ReactNode }) {
    if (!time || !label) return null
    return (
      <Cue time={time} label={label}>
        {children}
      </Cue>
    )
  },
  chapter({ time, label, title }: { time?: string; label?: string; title?: string }) {
    if (!time || !label || !title) return null
    return <Chapter time={time} label={label} title={title} />
  },
} satisfies Partial<Components & Record<string, React.ComponentType<Record<string, unknown>>>>

const urlTransform: UrlTransform = (url, key, node) => {
  if (key === 'href' && node.tagName === 'a') return isSafeHref(url) ? url : null
  return defaultUrlTransform(url)
}

export function MarkdownContent({ source }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
        remarkDirective,
        remarkMarkdownOnly,
        remarkMark,
        remarkCallout,
        remarkWikiLink,
        remarkCue,
        remarkChapter,
        remarkDirectiveEmbeds,
      ]}
      skipHtml
      urlTransform={urlTransform}
      components={components as Components}
    >
      {source}
    </ReactMarkdown>
  )
}
