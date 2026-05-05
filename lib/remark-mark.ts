import { visit } from 'unist-util-visit'
import type { Root, Text } from 'mdast'

type HtmlText = Text & {
  data: {
    hName: string
  }
}

export function remarkMark() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      if (!node.value.includes('==')) return

      const parts = node.value.split(/(==.+?==)/g)
      if (parts.length === 1) return

      const newNodes: (HtmlText | Text)[] = parts
        .filter((p) => p !== '')
        .map((part) => {
          if (part.startsWith('==') && part.endsWith('==')) {
            return {
              type: 'text',
              value: part.slice(2, -2),
              data: { hName: 'mark' },
            }
          }
          return { type: 'text', value: part }
        })

      parent.children.splice(index, 1, ...newNodes)
      return index + newNodes.length
    })
  }
}
