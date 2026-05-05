import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import { MDXContent } from '@/app/components/MDXContent'
import Header from '@/app/components/Header'
import { siteConfig } from '@/site.config'
import styles from './page.module.css'

export default function HomePage() {
  const home = posts.find((p) => p.slugAsParams === siteConfig.homeSlug)
  if (!home) notFound()

  return (
    <main className={styles.main}>
      <Header title={home.title} />
      <article className={styles.article}>
        <MDXContent code={home.body} />
      </article>
      <footer className={styles.footer}>
        {siteConfig.footerLinks.map((link) => (
          <a key={link.slug} href={`/${link.slug}`} className={styles.footerLink}>
            {link.label} →
          </a>
        ))}
      </footer>
    </main>
  )
}
