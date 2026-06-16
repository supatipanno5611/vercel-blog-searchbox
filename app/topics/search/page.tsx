import { Suspense } from 'react'
import { getAllTopics, getAllPosts } from '@/lib/topics'
import { getCuratedTopics } from '@/lib/curatedTopics'
import TopicsClient from '../[topic]/TopicsClient'
import { uiText } from '@/lib/ui-text'
import { staticMetadata } from '@/lib/metadata'

export default function TopicsSearchPage() {
  return (
    <Suspense>
      <TopicsClient topic={null} posts={getAllPosts()} allTopics={getAllTopics()} curatedTopics={getCuratedTopics()} />
    </Suspense>
  )
}

export function generateMetadata() {
  return staticMetadata(uiText.meta.topicSearch)
}