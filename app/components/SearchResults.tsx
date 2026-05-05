'use client'

import Link from 'next/link'
import { highlight } from '@/lib/highlight'
import { tagMatchesAnyTerm } from '@/lib/topic-match'
import type { SearchResult, TopicResult } from '@/lib/searchIndex'
import styles from './SearchBox.module.css'

function getSnippet(body: string, query: string, length = 80): string {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  const lower = body.toLowerCase()
  let pos = -1

  for (const term of terms) {
    const idx = lower.indexOf(term.toLowerCase())
    if (idx !== -1) {
      pos = idx
      break
    }
  }

  if (pos === -1) return body.slice(0, length) + (body.length > length ? '...' : '')

  const start = Math.max(0, pos - 25)
  const end = Math.min(body.length, start + length)
  return (start > 0 ? '...' : '') + body.slice(start, end) + (end < body.length ? '...' : '')
}

type Props = {
  filter: string
  query: string
  hasQuery: boolean
  results: SearchResult[]
  topicResults: TopicResult[]
  activeIndex: number
  onActiveChange: (i: number) => void
  onClose: () => void
  activeItemRef: React.RefObject<HTMLLIElement | null>
}

export default function SearchResults({
  filter,
  query,
  hasQuery,
  results,
  topicResults,
  activeIndex,
  onActiveChange,
  onClose,
  activeItemRef,
}: Props) {
  return (
    <ul className={styles.results}>
      {filter === 'base' ? (
        <>
          {hasQuery &&
            topicResults.map((result, i) => {
              const isActive = i === activeIndex
              return (
                <li
                  key={result.name}
                  ref={isActive ? activeItemRef : null}
                  className={isActive ? styles.active : undefined}
                  onMouseEnter={() => onActiveChange(i)}
                >
                  <Link href={result.url} onClick={onClose}>
                    <span className={styles.title}>{highlight(result.name, query, styles.mark)}</span>
                    <span className={styles.topicCount}>{result.count} posts</span>
                  </Link>
                </li>
              )
            })}
          <li
            ref={topicResults.length === activeIndex ? activeItemRef : null}
            className={topicResults.length === activeIndex ? styles.active : undefined}
            onMouseEnter={() => onActiveChange(topicResults.length)}
          >
            <Link href="/topics/search" onClick={onClose} className={styles.gotoTopicSearch}>
              Browse topics
            </Link>
          </li>
        </>
      ) : !hasQuery ? (
        <li className={styles.guide}>Search by title, body, or topic.</li>
      ) : results.length === 0 ? (
        <li className={styles.empty}>No results for &quot;{query}&quot;.</li>
      ) : (
        results.map((result, i) => {
          const matchedFields = new Set(Object.values(result.match).flat())
          const snippet = matchedFields.has('body') ? getSnippet(result.body, query) : null
          const showTags = result.tags.length > 0 && filter === 'all' && matchedFields.has('base')
          const isActive = i === activeIndex

          return (
            <li
              key={result.id}
              ref={isActive ? activeItemRef : null}
              className={isActive ? styles.active : undefined}
              onMouseEnter={() => onActiveChange(i)}
            >
              <Link href={result.url} onClick={onClose}>
                <span className={styles.title}>{highlight(result.title, query, styles.mark)}</span>
                {showTags && (
                  <span className={styles.tags}>
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        className={tagMatchesAnyTerm(tag, query) ? styles.tagMatched : styles.tagOther}
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
                {snippet && <span className={styles.snippet}>{highlight(snippet, query, styles.mark)}</span>}
              </Link>
            </li>
          )
        })
      )}
    </ul>
  )
}
