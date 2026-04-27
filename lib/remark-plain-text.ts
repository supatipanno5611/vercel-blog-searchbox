import { visit } from 'unist-util-visit'
import type { Root, Text, InlineCode } from 'mdast'
import type { VFile } from 'vfile'

declare module 'vfile' {
  interface DataMap {
    plainText?: string
  }
}

export function remarkPlainText() {
  return (tree: Root, file: VFile) => {
    const chunks: string[] = []

    visit(tree, (node) => {
      if (node.type === 'text' || node.type === 'inlineCode') {
        chunks.push((node as Text | InlineCode).value)
      }
    })

    file.data.plainText = chunks.join(' ').replace(/\s+/g, ' ').slice(0, 3000)
  }
}
