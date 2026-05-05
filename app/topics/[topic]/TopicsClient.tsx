'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { overlapCount, jaccard } from '@/lib/topics'
import TopicPicker from '@/app/components/TopicPicker'
import { useHideOnScroll } from '@/app/components/useHideOnScroll'
import { useCtrlSlash } from '@/app/components/hooks/useCtrlSlash'
import fabStyles from '@/app/components/Fab.module.css'
import searchFabStyles from '@/app/components/Search.module.css'
import styles from './page.module.css'

type PostSummary = {
  slugAsParams: string
  title: string
  base: string[]
}

type TopicInfo = { name: string; count: number }

type Props = {
  topic: string | null
  posts: PostSummary[]
  allTopics: TopicInfo[]
  recentTopics: string[]
}

export default function TopicsClient({ topic, posts, allTopics, recentTopics }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const extraTopics = searchParams.get('with')?.split(',').filter(Boolean).map(decodeURIComponent) ?? []
  const selected = topic ? [topic, ...extraTopics] : extraTopics

  const [pickerOpen, setPickerOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(30)
  const pickerVisible = useHideOnScroll()

  useEffect(() => {
    setVisibleCount(30)
  }, [selected.join(',')])

  useCtrlSlash(useCallback(() => setPickerOpen(true), []))

  function buildUrl(newSelected: string[]): string {
    const [main, ...extras] = newSelected
    if (!main) return '/topics/search'
    const qs = extras.length ? `?with=${extras.map(encodeURIComponent).join(',')}` : ''
    return `/topics/${encodeURIComponent(main)}${qs}`
  }

  function addTopic(t: string) {
    router.push(buildUrl([...selected, t]))
  }

  function removeTopic(t: string) {
    router.push(buildUrl(selected.filter((s) => s !== t)))
  }

  function handleSingleSelect(t: string) {
    if (selected.includes(t)) removeTopic(t)
    else addTopic(t)
    setPickerOpen(false)
  }

  function handleToggleSelect(t: string) {
    if (selected.includes(t)) removeTopic(t)
    else addTopic(t)
  }

  function handleFallbackSearch(q: string) {
    setPickerOpen(false)
    window.dispatchEvent(new CustomEvent('open-global-search', { detail: { query: q } }))
  }

  const andResults = selected.length === 0 ? [] : posts.filter((p) => selected.every((t) => p.base.includes(t)))
  const usedFallback = andResults.length === 0 && selected.length > 1
  const filtered = usedFallback ? posts.filter((p) => selected.some((t) => p.base.includes(t))) : andResults
  const sorted = filtered
    .map((p) => ({ p, overlap: overlapCount(p.base, selected), sim: jaccard(p.base, selected) }))
    .sort((a, b) => b.overlap - a.overlap || b.sim - a.sim)
    .map((x) => x.p)

  return (
    <main className={styles.main}>
      <button
        className={`${fabStyles.fab} ${searchFabStyles.search} ${pickerVisible ? '' : fabStyles.fabHidden}`}
        onClick={() => setPickerOpen(true)}
        aria-label="Open topic search"
        title="Topic search (Ctrl+/)"
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <TopicPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allTopics={allTopics}
        selected={selected}
        onSingleSelect={handleSingleSelect}
        onToggleSelect={handleToggleSelect}
        onFallbackSearch={handleFallbackSearch}
      />

      {selected.length > 0 && (
        <div className={styles.header}>
          <div className={styles.chips}>
            {selected.map((t, i) => (
              <span key={t} className={`${styles.chip} ${i === 0 ? styles.chipMain : styles.chipExtra}`}>
                {t}
                <button className={styles.chipRemove} onClick={() => removeTopic(t)} aria-label={`Remove ${t}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {selected.length === 0 && recentTopics.length > 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyHint}>Recent topics</p>
          <div className={styles.recommendList}>
            {recentTopics.map((name) => {
              const info = allTopics.find((topicInfo) => topicInfo.name === name)
              return (
                <button key={name} className={styles.recommendChip} onClick={() => addTopic(name)}>
                  {name}
                  {info && <span className={styles.recommendCount}>{info.count} posts</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selected.length === 0 && recentTopics.length === 0 && <p className={styles.emptyHint}>Select a topic to browse posts.</p>}

      {selected.length > 0 && sorted.length === 0 && (
        <p className={styles.empty}>
          No posts match this topic set.{' '}
          <button className={styles.resetBtn} onClick={() => router.push('/topics/search')}>
            Reset search
          </button>
        </p>
      )}

      {selected.length > 0 && sorted.length > 0 && (
        <>
          {usedFallback && <p className={styles.fallbackNotice}>No exact match. Showing related posts instead.</p>}
          <p className={styles.count}>{sorted.length} posts</p>
          <ul className={styles.list}>
            {sorted.slice(0, visibleCount).map((p) => (
              <li key={p.slugAsParams}>
                <a href={`/${p.slugAsParams}`} className={styles.item}>
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
          {sorted.length > visibleCount && (
            <button className={styles.moreBtn} onClick={() => setVisibleCount((c) => c + 30)}>
              Show more
            </button>
          )}
        </>
      )}
    </main>
  )
}
