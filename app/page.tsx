import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import { MDXContent } from '@/app/components/MDXContent'
import Header from '@/app/components/Header'
import styles from './page.module.css'

const FOOTER_LINKS = [
  { slug: '사용-안내', label: '사용 안내' },
  { slug: '웹사이트에-기여한-사람들', label: '웹사이트에 기여한 사람들' },
]

export default function HomePage() {
  const home = posts.find((p) => p.slugAsParams === 'home')
  if (!home) notFound()

  return (
    <main className={styles.main}>
      <Header title={home.title} />
      <article className={styles.article}>
        <MDXContent code={home.body} />
      </article>
      <footer className={styles.footer}>
        {FOOTER_LINKS.map((link) => (
          <a key={link.slug} href={`/${link.slug}`} className={styles.footerLink}>
            {link.label} →
          </a>
        ))}
      </footer>
    </main>
  )
}
