import { Suspense } from 'react'
import { getAllTopics, getAllPosts } from '@/lib/topics'
import { getCuratedTopics } from '@/lib/curatedTopics'
import TopicsClient from '../[topic]/TopicsClient'

export default function TopicsSearchPage() {
  return (
    <Suspense>
      <TopicsClient topic={null} posts={getAllPosts()} allTopics={getAllTopics()} curatedTopics={getCuratedTopics()} />
    </Suspense>
  )
}
