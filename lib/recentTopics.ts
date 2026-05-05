import { posts } from '#site/content'
import { siteConfig } from '@/site.config'

export function getRecentTopics(): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const title of siteConfig.recentPostTitles) {
    const post = posts.find((p) => p.title === title)
    if (!post) continue

    for (const base of post.base) {
      if (seen.has(base)) continue
      seen.add(base)
      result.push(base)
    }
  }

  return result
}
