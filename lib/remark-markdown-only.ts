import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'

const MDX_IMPORT_EXPORT_RE = /^\s*(?:import|export)\s/m
const MDX_EXPRESSION_RE = /(^|[\s(>])\{[^}\n]+\}/

export function rejectMdxSyntax(source: string) {
  if (MDX_IMPORT_EXPORT_RE.test(source)) {
    throw new Error('MDX import/export is not supported in Markdown-only content')
  }

  if (MDX_EXPRESSION_RE.test(source)) {
    throw new Error('MDX expressions are not supported in Markdown-only content')
  }
}

export function remarkMarkdownOnly() {
  return (tree: Root) => {
    visit(tree, 'html', (node: { value?: string }) => {
      throw new Error(`Raw HTML is not supported in Markdown-only content: ${node.value ?? '<html>'}`)
    })
  }
}
