import { defineConfig, defineCollection, s } from 'velite'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { VFile } from 'vfile'
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
    const file = new VFile({ value: raw ?? '' })
    await processor.run(tree, file)
    const filename = data.slug.split('/').pop() ?? data.slug
    return {
      ...data,
      title: filename,
      slugAsParams: data.slug.replace(/^posts\//, '').replace(/\s+/g, '-'),
      plainText: file.data.plainText ?? '',
    }
  }),
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
  },
  collections: { posts },
  mdx: {
    remarkPlugins: [remarkMark, remarkCallout, remarkWikiLink],
  },
})
