import styles from './Header.module.css'

type Props = {
  title?: string
}

export default function Header({ title }: Props) {
  return (
    <header className={styles.header}>
      {title && <span className={styles.pageTitle}>{title}</span>}
    </header>
  )
}
