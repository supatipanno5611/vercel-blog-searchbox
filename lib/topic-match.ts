import { disassemble } from 'es-hangul'

export function tagMatchesAnyTerm(tag: string, query: string): boolean {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  const dTag = disassemble(tag.toLowerCase())
  return terms.some((term) => dTag.includes(disassemble(term.toLowerCase())))
}

export function topicIncludesQuery(name: string, query: string): boolean {
  if (!query.trim()) return true
  return disassemble(name.toLowerCase()).includes(disassemble(query.toLowerCase().trim()))
}
