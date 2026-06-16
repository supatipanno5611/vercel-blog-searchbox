import { Suspense } from 'react'
import SearchPageClient from './SearchPageClient'
import { uiText } from '@/lib/ui-text'
import { staticMetadata } from '@/lib/metadata'

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  )
}

export function generateMetadata() {
  return staticMetadata(uiText.meta.search)
}