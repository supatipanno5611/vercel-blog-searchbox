import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { safeDecodeURIComponent } from '@/lib/safe-decode'
import { getAllTopics, getPostsByTopic } from '@/lib/topics'
import { getCuratedTopics } from '@/lib/curatedTopics'
import TopicsClient from './TopicsClient'

type Props = {
  params: Promise<{ topic: string }>
}

export async function generateStaticParams() {
  return getAllTopics().map(({ name }) => ({ topic: name }))
}

export default async function TopicPage({ params }: Props) {
  const { topic } = await params
  const decodedTopic = safeDecodeURIComponent(topic)
  if (!decodedTopic) notFound()
  const allTopics = getAllTopics()
  if (!allTopics.some((t) => t.name === decodedTopic)) notFound()

  const topicPosts = getPostsByTopic(decodedTopic).map((p) => ({
    slugAsParams: p.slugAsParams,
    title: p.title,
    base: p.base,
  }))

  return (
    <Suspense>
      <TopicsClient topic={decodedTopic} posts={topicPosts} allTopics={allTopics} curatedTopics={getCuratedTopics()} />
    </Suspense>
  )
}
