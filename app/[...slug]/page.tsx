import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import PostDetail from '@/app/components/PostDetail'
import { isOrdinaryPath } from '@/lib/ordinary'
import { safeDecodeURIComponent } from '@/lib/safe-decode'

type Props = {
  params: Promise<{ slug: string[] }>
}

async function resolvePost(params: Promise<{ slug: string[] }>) {
  const { slug } = await params
  const decodedSlug: string[] = []
  for (const segment of slug) {
    const decodedSegment = safeDecodeURIComponent(segment)
    if (decodedSegment === null) return null
    decodedSlug.push(decodedSegment)
  }
  const path = decodedSlug.join('/')
  return posts.find((candidate) => candidate.slugAsParams === path && !isOrdinaryPath(candidate.slug)) ?? null
}

export async function generateStaticParams() {
  return posts
    .filter((post) => !isOrdinaryPath(post.slug))
    .map((post) => ({
      slug: post.slugAsParams.split('/'),
    }))
}

export async function generateMetadata({ params }: Props) {
  const post = await resolvePost(params)
  if (!post) return {}
  return { description: post.title }
}

export default async function PostPage({ params }: Props) {
  const post = await resolvePost(params)
  if (!post) notFound()
  return <PostDetail post={post} />
}