import MiniSearch from 'minisearch'
import { disassemble } from 'es-hangul'
import type { SearchDoc } from './search'

export type SearchResult = SearchDoc & {
  score: number
  terms: string[]
  queryTerms: string[]
  match: Record<string, string[]>
}

export type TopicResult = { name: string; count: number; url: string }

const MAX_RESULTS = 6

let miniSearch: MiniSearch | null = null
let docsCache: SearchDoc[] | null = null
let indexPromise: Promise<void> | null = null

function buildIndex(docs: SearchDoc[]): MiniSearch {
  const ms = new MiniSearch({
    fields: ['title', 'body', 'base', 'audioTitle', 'choseong'],
    storeFields: ['title', 'url', 'body', 'base', 'audioTitle', 'tags'],
    processTerm: (term) => disassemble(term),
    searchOptions: { boost: { title: 3, base: 2, audioTitle: 0.5 }, fuzzy: 0.2, prefix: true },
  })
  ms.addAll(docs)
  return ms
}

export function loadIndex(): Promise<void> {
  if (miniSearch) return Promise.resolve()
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load search index: ${r.status}`)
        return r.json()
      })
      .then((docs: SearchDoc[]) => {
        docsCache = docs
        miniSearch = buildIndex(docs)
      })
      .catch((error) => {
        indexPromise = null
        throw error
      })
  }
  return indexPromise
}

export function isIndexReady(): boolean {
  return miniSearch !== null
}

export function searchDocs(q: string, fields?: string[]): SearchResult[] {
  if (!miniSearch || !q.trim()) return []
  return (miniSearch.search(q, fields ? { fields } : {}) as SearchResult[]).slice(0, MAX_RESULTS)
}

export function searchTopics(query: string): TopicResult[] {
  if (!docsCache) return []

  const counts = new Map<string, number>()
  for (const doc of docsCache) {
    for (const tag of doc.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  const dQuery = disassemble(query.toLowerCase().trim())
  return Array.from(counts.entries())
    .filter(([name]) => disassemble(name.toLowerCase()).includes(dQuery))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_RESULTS)
    .map(([name, count]) => ({ name, count, url: `/topics/${encodeURIComponent(name)}` }))
}
