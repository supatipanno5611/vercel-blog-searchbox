import type { Root, Heading, Text } from 'mdast'
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx'
import { TIME_PATTERN, parseTime } from './parse-time'

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
      const chapter: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'Chapter',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'time', value: String(seconds) },
          { type: 'mdxJsxAttribute', name: 'label', value: m[1] },
          { type: 'mdxJsxAttribute', name: 'title', value: m[2] },
        ],
        children: [],
      }
      out.push(chapter)
    }
    tree.children = out
  }
}
