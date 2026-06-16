import { siteConfig } from '@/site.config'

export function dynamicMetadata(title: string) {
  return {
    description: title,
    openGraph: {
      title: `${title} | ${siteConfig.title}`,
      description: title,
    },
  }
}

export function staticMetadata(description: string) {
  return {
    description,
    openGraph: {
      title: siteConfig.title,
      description,
    },
  }
}