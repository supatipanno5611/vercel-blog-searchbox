import type { Root, Heading, Text } from 'mdast'
import { TIME_PATTERN, parseTime } from './parse-time'

type HtmlNode = Root['children'][number] & {
  data: {
    hName: string
    hProperties?: Record<string, unknown>
  }
  children: []
}

const CHAPTER_RE = new RegExp(`^(${TIME_PATTERN})\\s+(.+)$`)

export function remarkChapter() {
  return (tree: Root) => {
    const out: typeof tree.children = []
    for (const node of tree.children) {
      if (node.type !== 'heading' || (node as Heading).depth !== 2) {
        out.push(node)
        continue
      }
      const h = node as Heading
      const first = h.children[0]
      if (!first || first.type !== 'text') {
        out.push(node)
        continue
      }
      const m = (first as Text).value.match(CHAPTER_RE)
      if (!m) {
        out.push(node)
        continue
      }
      const seconds = parseTime(m[1])
      const chapter: HtmlNode = {
        type: 'heading',
        depth: 2,
        data: {
          hName: 'chapter',
          hProperties: {
            time: String(seconds),
            label: m[1],
            title: m[2],
          },
        },
        children: [],
      } as HtmlNode
      out.push(chapter)
    }
    tree.children = out
  }
}
