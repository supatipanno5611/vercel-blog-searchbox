'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { highlight } from '@/lib/highlight'
import { topicIncludesQuery } from '@/lib/topic-match'
import searchStyles from './SearchBox.module.css'
import styles from './TopicPicker.module.css'

type TopicInfo = { name: string; count: number }

const noopSubscribe = () => () => {}

type Props = {
  open: boolean
  onClose: () => void
  allTopics: TopicInfo[]
  selected: string[]
  onSingleSelect: (topic: string) => void
  onToggleSelect: (topic: string) => void
  onFallbackSearch: (query: string) => void
}

export default function TopicPicker({
  open,
  onClose,
  allTopics,
  selected,
  onSingleSelect,
  onToggleSelect,
  onFallbackSearch,
}: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const activeItemRef = useRef<HTMLLIElement | null>(null)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)

  const filtered = allTopics.filter((topic) => topicIncludesQuery(topic.name, query))
  const showFallback = query.trim() !== '' && filtered.length === 0
  const listLength = showFallback ? 1 : filtered.length

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
      return
    }

    inputRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, listLength - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showFallback) {
        onFallbackSearch(query)
        return
      }

      const topic = filtered[activeIndex]
      if (!topic) return
      if (e.ctrlKey) {
        onToggleSelect(topic.name)
        setQuery('')
        setActiveIndex(0)
      } else {
        onSingleSelect(topic.name)
      }
    } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      e.preventDefault()
      onToggleSelect(selected[selected.length - 1])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <>
      {mounted && createPortal(<div className={searchStyles.overlayBackdrop} onClick={onClose} />, document.body)}
      <div className={`${searchStyles.container} ${searchStyles.overlayContainer}`} role="dialog" aria-modal="true" aria-label="Topic search">
        <div className={searchStyles.inputWrap}>
          <button className={searchStyles.backButton} onClick={onClose} aria-label="Close topic search">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden>
              <polyline
                points="12,4 6,10 12,16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className={searchStyles.inputField}>
            <svg className={searchStyles.icon} viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              className={searchStyles.input}
              type="text"
              placeholder="Search topics"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
              aria-autocomplete="list"
            />
            {query && (
              <button
                className={searchStyles.clear}
                onClick={() => {
                  setQuery('')
                  setActiveIndex(0)
                  inputRef.current?.focus()
                }}
                aria-label="Clear topic search"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                  <line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className={`${searchStyles.dropdown} ${searchStyles.overlayDropdown}`} onMouseDown={(e) => e.preventDefault()}>
          <ul className={searchStyles.results} role="listbox">
            {showFallback ? (
              <li ref={activeItemRef} className={styles.fallbackRow}>
                <button className={styles.fallbackBtn} onClick={() => onFallbackSearch(query)}>
                  <span className={searchStyles.title}>Search all posts for &quot;{query}&quot;</span>
                </button>
              </li>
            ) : (
              filtered.map((topic, i) => {
                const isActive = i === activeIndex
                const isSelected = selected.includes(topic.name)
                return (
                  <li
                    key={topic.name}
                    ref={isActive ? activeItemRef : null}
                    className={`${isActive ? styles.activeRow : ''} ${isSelected ? styles.rowSelected : ''}`}
                    role="option"
                    aria-selected={isActive}
                    aria-checked={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <button className={styles.topicRow} onClick={() => onToggleSelect(topic.name)}>
                      <span className={searchStyles.title}>{highlight(topic.name, query, searchStyles.mark)}</span>
                      <span className={styles.meta}>
                        {isSelected && <span className={styles.checkIcon} aria-hidden>✓</span>}
                        <span className={searchStyles.topicCount}>{topic.count} posts</span>
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <div className={searchStyles.hint}>
            <span>Arrows move</span>
            <span>Enter select</span>
            <span>Ctrl+Enter keep open</span>
            <span>Esc close</span>
          </div>
        </div>
      </div>
    </>
  )
}
