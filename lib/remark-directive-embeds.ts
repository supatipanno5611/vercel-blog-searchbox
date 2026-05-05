import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'
import { isSafeAudioSrc, YOUTUBE_ID_RE } from './markdown-security'

type DirectiveNode = Root['children'][number] & {
  name?: string
  attributes?: Record<string, unknown> | null
  data?: {
    hName?: string
    hProperties?: Record<string, unknown>
  }
}

function stringAttr(node: DirectiveNode, key: string) {
  const value = node.attributes?.[key]
  return typeof value === 'string' ? value : undefined
}

export function remarkDirectiveEmbeds() {
  return (tree: Root) => {
    visit(tree, ['leafDirective', 'containerDirective', 'textDirective'], (node) => {
      const directive = node as DirectiveNode
      if (directive.name === 'youtube') {
        if (directive.type !== 'leafDirective') throw new Error('youtube must use leaf directive syntax: ::youtube{id="VIDEO_ID"}')

        const id = stringAttr(directive, 'id')
        if (!id || !YOUTUBE_ID_RE.test(id)) throw new Error(`Invalid YouTube id in directive: ${id ?? '<missing>'}`)

        directive.data = {
          hName: 'youtube',
          hProperties: { id },
        }
        return
      }

      if (directive.name === 'audio') {
        if (directive.type !== 'leafDirective') throw new Error('audio must use leaf directive syntax: ::audio{src="https://..."}')

        const src = stringAttr(directive, 'src')
        if (!src || !isSafeAudioSrc(src)) throw new Error(`Invalid audio src in directive: ${src ?? '<missing>'}`)

        const title = stringAttr(directive, 'title')
        directive.data = {
          hName: 'audio',
          hProperties: title ? { src, title, controls: true } : { src, controls: true },
        }
        return
      }

      throw new Error(`Unsupported Markdown directive: ${directive.name ?? '<missing>'}`)
    })
  }
}
