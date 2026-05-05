export function highlight(text: string, query: string, markClassName: string): React.ReactNode {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return text

  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className={markClassName}>
        {part}
      </mark>
    ) : (
      part
    )
  )
}
