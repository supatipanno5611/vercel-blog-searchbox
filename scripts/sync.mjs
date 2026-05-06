import { readdir, readFile, writeFile, unlink, stat, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { argv, cwd, stdin, stdout } from 'node:process'
import readline from 'node:readline/promises'
import { siteConfig } from '../site.config.ts'

const ROOT = cwd()
const VAULT_PUBLISH = resolve(getRequiredConfig('VAULT_PUBLISH'))
const VERCEL_CONTENT = resolve(process.env.VERCEL_CONTENT ?? join(ROOT, 'content'))
const MANIFEST_PATH = resolve(process.env.SYNC_MANIFEST ?? join(ROOT, '.sync-state.json'))

const AUTO_YES = argv.includes('--yes')
const MTIME_TOLERANCE_MS = 1000
const INVISIBLE_TEXT_RE = /[\u200B\uFEFF]/g

const LABEL = {
  add: '새 글을 content에 추가',
  update: 'content 글 갱신',
  'delete-publish': 'content에서 사라진 글을 _publish에서도 삭제',
  'delete-vercel': '_publish에서 사라진 글을 content에서도 삭제',
  'warn-vercel-newer': 'content가 더 최신이라 건너뜀',
  'warn-orphan': 'content에만 있어서 건너뜀',
}

function getRequiredConfig(name) {
  const value = siteConfig[name]
  if (!value) throw new Error(`${name} must be set before running sync.`)
  return value
}

async function main() {
  if (!existsSync(VAULT_PUBLISH)) {
    throw new Error(`Publish folder does not exist: ${VAULT_PUBLISH}\nSet VAULT_PUBLISH to your Obsidian _publish folder.`)
  }

  const manifestSet = new Set(await loadManifest())
  await mkdir(VERCEL_CONTENT, { recursive: true })

  const publishSet = new Set(
    (await readdir(VAULT_PUBLISH))
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''))
  )
  const vercelSet = new Set(
    (await readdir(VERCEL_CONTENT))
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''))
  )

  const actions = []
  const allNames = new Set([...publishSet, ...vercelSet, ...manifestSet])

  for (const name of allNames) {
    const inPublish = publishSet.has(name)
    const inVercel = vercelSet.has(name)
    const inManifest = manifestSet.has(name)

    if (inPublish && inVercel) {
      const publishStat = await stat(join(VAULT_PUBLISH, `${name}.md`))
      const vercelStat = await stat(join(VERCEL_CONTENT, `${name}.md`))
      if (publishStat.mtimeMs > vercelStat.mtimeMs + MTIME_TOLERANCE_MS) {
        actions.push({ type: 'update', name })
      } else if (vercelStat.mtimeMs > publishStat.mtimeMs + MTIME_TOLERANCE_MS) {
        actions.push({ type: 'warn-vercel-newer', name })
      }
    } else if (inPublish && !inVercel && !inManifest) {
      actions.push({ type: 'add', name })
    } else if (inPublish && !inVercel && inManifest) {
      actions.push({ type: 'delete-publish', name })
    } else if (!inPublish && inVercel && inManifest) {
      actions.push({ type: 'delete-vercel', name })
    } else if (!inPublish && inVercel && !inManifest) {
      actions.push({ type: 'warn-orphan', name })
    }
  }

  if (actions.length === 0) {
    console.log('변경 사항 없음.')
    await saveCurrentManifest(publishSet, vercelSet)
    return
  }

  console.log('계획:')
  for (const action of actions) console.log(`  [${LABEL[action.type]}] ${action.name}`)

  if (!AUTO_YES) {
    const rl = readline.createInterface({ input: stdin, output: stdout })
    const answer = await rl.question('진행할까요? [y/N] ')
    rl.close()
    if (answer.trim().toLowerCase() !== 'y') {
      console.log('취소됨.')
      return
    }
  }

  for (const action of actions) {
    const publishPath = join(VAULT_PUBLISH, `${action.name}.md`)
    const vercelPath = join(VERCEL_CONTENT, `${action.name}.md`)

    switch (action.type) {
      case 'add':
        await syncMarkdownFile(publishPath, vercelPath)
        console.log(`  + content에 추가: ${action.name}`)
        break
      case 'update':
        await syncMarkdownFile(publishPath, vercelPath)
        console.log(`  ↻ content 갱신: ${action.name}`)
        break
      case 'delete-publish':
        await unlink(publishPath)
        console.log(`  - _publish에서 삭제: ${action.name}`)
        break
      case 'delete-vercel':
        await unlink(vercelPath)
        console.log(`  - content에서 삭제: ${action.name}`)
        break
      case 'warn-vercel-newer':
        console.warn(`  ! content가 더 최신입니다. 수동 편집 가능성이 있어 건너뜀: ${action.name}`)
        break
      case 'warn-orphan':
        console.warn(`  ! content에만 존재합니다. 추적된 파일이 아니라 건너뜀: ${action.name}`)
        break
    }
  }

  const finalPublish = new Set(
    (await readdir(VAULT_PUBLISH)).filter((file) => file.endsWith('.md')).map((file) => file.replace(/\.md$/, ''))
  )
  const finalVercel = new Set(
    (await readdir(VERCEL_CONTENT)).filter((file) => file.endsWith('.md')).map((file) => file.replace(/\.md$/, ''))
  )
  await saveCurrentManifest(finalPublish, finalVercel)
  console.log('완료.')
}

async function syncMarkdownFile(from, to) {
  const source = await readFile(from, 'utf8')
  const converted = convertLegacyMdxEmbeds(source)
  validateMarkdownOnly(converted, from)
  await writeFile(to, converted, 'utf8')
}

function convertLegacyMdxEmbeds(source) {
  const parts = splitFrontmatter(removeInvisibleText(source))
  const data = parseFrontmatter(parts.matter)
  let body = transformOutsideFencedCode(parts.body, (segment) =>
    segment
      .replace(/<YouTubeEmbed\s+([^>]*?)\/?>/gis, (_match, attrs) => {
        const id = getQuotedAttribute(attrs, 'id')
        if (!id) throw new Error('YouTubeEmbed is missing an id attribute')
        data.youtubeId = id
        return ''
      })
      .replace(/<audio\b([^>]*)>(?:\s*<\/audio>)?/gis, (_match, attrs) => {
        const src = getQuotedAttribute(attrs, 'src')
        const title = getQuotedAttribute(attrs, 'title')
        if (!src) throw new Error('audio is missing a src attribute')
        const normalizedSrc = normalizeAudioSrc(src)
        data.audioSrc = normalizedSrc
        if (title) data.audioTitle = title.trim()
        return ''
      })
      .replace(/::youtube\{([^}]*)\}/g, (_match, attrs) => {
        const id = getQuotedAttribute(attrs, 'id')
        if (!id) throw new Error('youtube directive is missing an id attribute')
        data.youtubeId = id
        return ''
      })
      .replace(/::audio\{([^}]*)\}/g, (_match, attrs) => {
        const src = getQuotedAttribute(attrs, 'src')
        const title = getQuotedAttribute(attrs, 'title')
        if (!src) throw new Error('audio directive is missing a src attribute')
        data.audioSrc = normalizeAudioSrc(src)
        if (title) data.audioTitle = title.trim()
        return ''
      })
      .replace(/\n{3,}/g, '\n\n')
  )

  delete data.media
  const matter = stringifyFrontmatter(data)
  return `${parts.start || '---\n'}${matter}${parts.end || '\n---\n'}${body}`
}

function normalizeAudioSrc(value) {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (collapsed.startsWith('/')) return collapsed.replace(/ /g, '%20')
  return new URL(collapsed).href
}

function getQuotedAttribute(attrs, name) {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))
  return match?.[2]
}

function removeInvisibleText(value) {
  return value.replace(INVISIBLE_TEXT_RE, '')
}

function transformOutsideFencedCode(source, transform) {
  const fenceRe = /(^|\n)(`{3,}|~{3,})[\s\S]*?\n\2(?=\n|$)/g
  let out = ''
  let last = 0
  for (const match of source.matchAll(fenceRe)) {
    out += transform(source.slice(last, match.index))
    out += match[0]
    last = match.index + match[0].length
  }
  out += transform(source.slice(last))
  return out
}

function stripFencedCode(source) {
  return source.replace(/(^|\n)(`{3,}|~{3,})[\s\S]*?\n\2(?=\n|$)/g, '$1')
}

function splitFrontmatter(source) {
  const open = source.match(/^---\r?\n/)
  if (!open) return { matter: null, body: source, start: '', end: '' }
  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return { matter: null, body: source, start: '', end: '' }
  return {
    matter: source.slice(open[0].length, close.index),
    body: source.slice(close.index + close[0].length),
    start: open[0],
    end: close[0],
  }
}

function parseFrontmatter(matter) {
  const data = {}
  if (matter === null) return data
  const lines = matter.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const scalar = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/)
    if (!scalar) continue
    const key = scalar[1]
    const value = scalar[2]
    if (value === '') {
      const list = []
      let j = i + 1
      while (j < lines.length) {
        const item = lines[j].match(/^\s*-\s*(.*?)\s*$/)
        if (!item) break
        list.push(unquote(item[1]))
        j++
      }
      data[key] = list
      i = j - 1
    } else if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item.trim()))
        .filter(Boolean)
    } else {
      data[key] = unquote(value)
    }
  }
  return data
}

function unquote(value) {
  return value.replace(/^(['"])(.*)\1$/, '$2')
}

function yamlScalar(value) {
  if (/^[A-Za-z0-9_./:%?&=#@+-]+$/.test(value)) return value
  return JSON.stringify(value)
}

function stringifyFrontmatter(data) {
  const lines = []
  if (data.draft !== undefined) lines.push(`draft: ${data.draft}`)
  if ((data.base ?? []).length === 0) {
    lines.push('base: []')
  } else {
    lines.push('base:')
    for (const base of data.base) lines.push(`  - ${base}`)
  }
  if (data.youtubeId) lines.push(`youtubeId: ${yamlScalar(data.youtubeId)}`)
  if (data.audioSrc) lines.push(`audioSrc: ${yamlScalar(data.audioSrc)}`)
  if (data.audioTitle) lines.push(`audioTitle: ${yamlScalar(data.audioTitle)}`)
  return lines.join('\n')
}

function validateMarkdownOnly(source, filePath) {
  const errors = []
  const markdownBody = stripFencedCode(source)

  if (/^\s*(?:import|export)\s/m.test(markdownBody)) {
    errors.push('import/export is not allowed')
  }
  if (/(^|[\s(>])\{[^}\n]+\}/.test(markdownBody)) {
    errors.push('MDX expressions are not allowed')
  }
  if (/<[A-Za-z][^>]*>/.test(markdownBody)) {
    errors.push('raw HTML/JSX is not allowed')
  }
  for (const match of markdownBody.matchAll(/::([A-Za-z][\w-]*)\b/g)) {
    errors.push(`unsupported directive: ${match[1]}`)
  }
  const { matter } = splitFrontmatter(source)
  const data = parseFrontmatter(matter)
  if (data.media !== undefined) errors.push('media frontmatter is not allowed')
  if (data.youtubeId && data.audioSrc) errors.push('youtubeId and audioSrc cannot be used together')
  if (data.youtubeId && !/^[A-Za-z0-9_-]{11}$/.test(data.youtubeId)) errors.push(`invalid YouTube id: ${data.youtubeId}`)
  if (data.audioSrc && !isSafeAudioSrc(data.audioSrc)) errors.push(`invalid audio src: ${data.audioSrc}`)
  if (data.audioSrc && !data.audioTitle?.trim()) errors.push('audioTitle required')
  if (!data.audioSrc && data.audioTitle !== undefined) {
    errors.push('audioTitle requires audioSrc')
  }

  if (errors.length > 0) {
    throw new Error(`Markdown-only validation failed for ${filePath}:\n- ${errors.join('\n- ')}`)
  }
}

function isSafeAudioSrc(value) {
  if (value.startsWith('/') && !value.startsWith('//') && !/[^\S\r\n]/.test(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return []
  try {
    const obj = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
    return Array.isArray(obj.files) ? obj.files : []
  } catch {
    return []
  }
}

async function saveCurrentManifest(publishSet, vercelSet) {
  const files = [...publishSet].filter((name) => vercelSet.has(name)).sort()
  await writeFile(MANIFEST_PATH, JSON.stringify({ files }, null, 2), 'utf8')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
