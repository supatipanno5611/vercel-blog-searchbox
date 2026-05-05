import type { Root, Paragraph, Text } from 'mdast'
import { TIME_PATTERN, parseTime } from './parse-time'

type HtmlNode = Root['children'][number] & {
  data: {
    hName: string
    hProperties?: Record<string, unknown>
  }
  children: Paragraph[]
}

const CUE_RE = new RegExp(`^▶\\s*(${TIME_PATTERN})\\s+`)

function getMarker(node: Root['children'][number]) {
  if (node.type !== 'paragraph') return null
  const first = (node as Paragraph).children[0]
  if (!first || first.type !== 'text') return null
  return first.value.match(CUE_RE)
}

export function remarkCue() {
  return (tree: Root) => {
    const nodes = tree.children
    const out: typeof nodes = []
    let i = 0
    while (i < nodes.length) {
      const node = nodes[i]
      const m = getMarker(node)
      if (!m) {
        out.push(node)
        i++
        continue
      }
      const p = node as Paragraph
      ;(p.children[0] as Text).value = (p.children[0] as Text).value.slice(m[0].length)
      const seconds = parseTime(m[1])
      const cueChildren: Paragraph[] = [p]
      let j = i + 1
      while (j < nodes.length && nodes[j].type === 'paragraph' && !getMarker(nodes[j])) {
        cueChildren.push(nodes[j] as Paragraph)
        j++
      }
      const cue: HtmlNode = {
        type: 'blockquote',
        data: {
          hName: 'cue',
          hProperties: {
            time: String(seconds),
            label: m[1],
          },
        },
        children: cueChildren,
      } as HtmlNode
      out.push(cue)
      i = j
    }
    tree.children = out
  }
}
