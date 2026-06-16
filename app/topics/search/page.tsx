import { Suspense } from 'react'
import { getAllTopics, getAllPosts } from '@/lib/topics'
import { getCuratedTopics } from '@/lib/curatedTopics'
import TopicsClient from '../[topic]/TopicsClient'
import { uiText } from '@/lib/ui-text'

export default function TopicsSearchPage() {
  return (
    <Suspense>
      <TopicsClient topic={null} posts={getAllPosts()} allTopics={getAllTopics()} curatedTopics={getCuratedTopics()} />
    </Suspense>
  )
}

export function generateMetadata() {
  return { description: uiText.meta.topicSearch }
}