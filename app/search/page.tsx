import { Suspense } from 'react'
import SearchPageClient from './SearchPageClient'
import { uiText } from '@/lib/ui-text'

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  )
}

export function generateMetadata() {
  return { description: uiText.meta.search }
}