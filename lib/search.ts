import { posts } from '#site/content'
import { getChoseong } from 'es-hangul'

export type SearchDoc = {
  id: string
  title: string
  url: string
  body: string
  base: string
  tags: string[]
  choseong: string
}

const EXCLUDED_SLUGS = new Set(['home', '사용-안내', '웹사이트에-기여한-사람들'])

export function getSearchDocs(): SearchDoc[] {
  return posts
    .filter((p) => !p.draft && !EXCLUDED_SLUGS.has(p.slugAsParams))
    .map((p) => {
      const baseStr = p.base.join(' ')
      const text = `${p.title} ${p.plainText} ${baseStr}`
      return {
        id: p.slugAsParams,
        title: p.title,
        url: `/${p.slugAsParams}`,
        body: p.plainText,
        base: baseStr,
        tags: p.base,
        choseong: getChoseong(text),
      }
    })
}
