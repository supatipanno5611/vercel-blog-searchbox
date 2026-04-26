import { defineConfig, defineCollection, s } from 'velite'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkPlainText } from './lib/remark-plain-text'
import { remarkMark } from './lib/remark-mark'
import { remarkCallout } from './lib/remark-callout'
import { remarkWikiLink } from './lib/remark-wiki-link'

const posts = defineCollection({
  name: 'Post',
  pattern: 'posts/**/*.mdx',
  schema: s.object({
    draft: s.boolean().default(false),
    base: s.string().array().default([]),
    slug: s.path(),
    body: s.mdx(),
    raw: s.raw(),
  }).transform(async ({ raw, ...data }) => {
    const processor = unified().use(remarkParse).use(remarkPlainText)
    const tree = processor.parse(raw ?? '')
    const file = { data: {} as Record<string, unknown> }
    await processor.run(tree, file as any)
    const filename = data.slug.split('/').pop() ?? data.slug
    return {
      ...data,
      title: filename,
      slugAsParams: data.slug.replace(/^posts\//, '').replace(/\s+/g, '-'),
      plainText: (file.data.plainText as string) ?? '',
    }
  }),
})

const pages = defineCollection({
  name: 'Page',
  pattern: 'pages/*.mdx',
  schema: s.object({
    slug: s.path(),
    title: s.string().optional(),
    body: s.mdx(),
  }).transform((data) => ({
    ...data,
    name: data.slug.replace(/^pages\//, ''),
  })),
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
  },
  collections: { posts, pages },
  mdx: {
    remarkPlugins: [remarkMark, remarkCallout, remarkWikiLink],
  },
})
