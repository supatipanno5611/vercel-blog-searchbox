import { Suspense } from 'react'
import { getAllTopics, getAllPosts } from '@/lib/topics'
import { getRecentTopics } from '@/lib/recentTopics'
import TopicsClient from '../[topic]/TopicsClient'

export default function TopicsSearchPage() {
  return (
    <Suspense>
      <TopicsClient topic={null} posts={getAllPosts()} allTopics={getAllTopics()} recentTopics={getRecentTopics()} />
    </Suspense>
  )
}
