import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { argv, cwd, env, exit, stdin, stdout } from 'node:process'
import readline from 'node:readline/promises'
import { isSafeAudioSrc, YOUTUBE_ID_RE } from '../lib/markdown-security.ts'
import { siteConfig } from '../site.config.ts'

const ROOT = cwd()
const SOURCE_ROOT = resolve(env.VAULT_PUBLISH ?? getRequiredConfig('VAULT_PUBLISH'))
const TARGET_ROOT = resolve(env.VERCEL_CONTENT ?? join(ROOT, 'content'))
const MANIFEST_PATH = resolve(env.SYNC_MANIFEST ?? join(ROOT, '.sync-state.json'))
const CHECK_ONLY = argv.includes('--check')
const INIT = argv.includes('--init')
const AUTO_YES = argv.includes('--yes')
const MANIFEST_VERSION = 1
const EXCLUDED_DIRS = new Set(['.git', '.obsidian', '.trash', 'node_modules'])

function getRequiredConfig(name) {
  const value = siteConfig[name]
  if (!value) throw new Error(`${name} must be set before running sync.`)
  return value
}

async function main() {
  if (INIT && CHECK_ONLY) throw new Error('--init and --check cannot be used together.')
  if (!existsSync(SOURCE_ROOT)) {
    throw new Error(`Source folder does not exist: ${SOURCE_ROOT}`)
  }

  await mkdir(TARGET_ROOT, { recursive: true })

  const sourceFiles = await scanMarkdownFiles(SOURCE_ROOT)
  const targetFiles = await scanMarkdownFiles(TARGET_ROOT)
  const manifest = INIT ? { files: new Map() } : await loadManifest()
  const plan = INIT
    ? buildInitPlan(sourceFiles, targetFiles)
    : buildSyncPlan(sourceFiles, targetFiles, manifest.files)

  printPlan(plan)

  if (plan.conflicts.length > 0) {
    throw new Error('Sync stopped because conflicts were found.')
  }

  if (CHECK_ONLY) {
    exit(planHasWork(plan) ? 1 : 0)
  }

  if (!planHasWork(plan)) {
    console.log('No changes.')
    await saveManifest(await buildManifestFromCurrentState())
    return
  }

  await validatePlannedWrites(plan)

  if (!AUTO_YES) {
    const rl = readline.createInterface({ input: stdin, output: stdout })
    const answer = await rl.question('Apply this sync plan? [y/N] ')
    rl.close()
    if (answer.trim().toLowerCase() !== 'y') {
      console.log('Canceled.')
      return
    }
  }

  await applyPlan(plan)
  await saveManifest(await buildManifestFromCurrentState())
  console.log('Sync complete.')
}

async function scanMarkdownFiles(root) {
  const files = new Map()
  await scanDir(root, root, files)
  return files
}

async function scanDir(root, dir, files) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        await scanDir(root, join(dir, entry.name), files)
      }
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) continue

    const path = join(dir, entry.name)
    const key = toRelativeKey(root, path)
    const content = await readFile(path)
    files.set(key, {
      key,
      path,
      hash: sha256(content),
    })
  }
}

function toRelativeKey(root, path) {
  return relative(root, path).replace(/\\/g, '/')
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

function buildInitPlan(sourceFiles, targetFiles) {
  const plan = emptyPlan()
  const keys = allKeys(sourceFiles, targetFiles)

  for (const key of keys) {
    const source = sourceFiles.get(key)
    const target = targetFiles.get(key)

    if (source && target && source.hash !== target.hash) {
      plan.conflicts.push({
        type: 'init-mismatch',
        key,
        reason: 'File exists on both sides with different content.',
      })
    } else if (source && !target) {
      plan.copySourceToTarget.push({ key, from: source.path, to: targetPathFor(key) })
    } else if (!source && target) {
      plan.unmanagedTarget.push({ key, path: target.path })
    } else if (source && target) {
      plan.adopt.push({ key })
    }
  }

  return plan
}

function buildSyncPlan(sourceFiles, targetFiles, manifestFiles) {
  const plan = emptyPlan()
  const keys = allKeys(sourceFiles, targetFiles, manifestFiles)

  for (const key of keys) {
    const source = sourceFiles.get(key)
    const target = targetFiles.get(key)
    const manifest = manifestFiles.get(key)

    if (!manifest) {
      if (source && target) {
        if (source.hash === target.hash) {
          plan.adopt.push({ key })
        } else {
          plan.conflicts.push({
            type: 'untracked-mismatch',
            key,
            reason: 'File exists on both sides but is not in the manifest.',
          })
        }
      } else if (source) {
        plan.copySourceToTarget.push({ key, from: source.path, to: targetPathFor(key) })
      } else if (target) {
        plan.unmanagedTarget.push({ key, path: target.path })
      }
      continue
    }

    if (!source && !target) {
      plan.removeFromManifest.push({ key })
      continue
    }

    if (!source && target) {
      if (target.hash === manifest.targetHash) {
        plan.deleteTarget.push({ key, path: target.path })
      } else {
        plan.conflicts.push({
          type: 'source-deleted-target-changed',
          key,
          reason: 'Source was deleted and target changed since the last sync.',
        })
      }
      continue
    }

    if (source && !target) {
      if (source.hash === manifest.sourceHash) {
        plan.deleteSource.push({ key, path: source.path })
      } else {
        plan.conflicts.push({
          type: 'target-deleted-source-changed',
          key,
          reason: 'Target was deleted and source changed since the last sync.',
        })
      }
      continue
    }

    const sourceChanged = source.hash !== manifest.sourceHash
    const targetChanged = target.hash !== manifest.targetHash

    if (sourceChanged && targetChanged) {
      if (source.hash === target.hash) {
        plan.adopt.push({ key })
      } else {
        plan.conflicts.push({
          type: 'both-changed',
          key,
          reason: 'Both source and target changed since the last sync.',
        })
      }
    } else if (sourceChanged) {
      plan.copySourceToTarget.push({ key, from: source.path, to: target.path })
    } else if (targetChanged) {
      plan.copyTargetToSource.push({ key, from: target.path, to: source.path })
    }
  }

  return plan
}

function emptyPlan() {
  return {
    adopt: [],
    copySourceToTarget: [],
    copyTargetToSource: [],
    deleteSource: [],
    deleteTarget: [],
    removeFromManifest: [],
    unmanagedTarget: [],
    conflicts: [],
  }
}

function allKeys(...collections) {
  const keys = new Set()
  for (const collection of collections) {
    for (const key of collection.keys()) keys.add(key)
  }
  return [...keys].sort()
}

function targetPathFor(key) {
  return join(TARGET_ROOT, ...key.split('/'))
}

function planHasWork(plan) {
  return (
    plan.adopt.length > 0 ||
    plan.copySourceToTarget.length > 0 ||
    plan.copyTargetToSource.length > 0 ||
    plan.deleteSource.length > 0 ||
    plan.deleteTarget.length > 0 ||
    plan.removeFromManifest.length > 0
  )
}

function printPlan(plan) {
  console.log(INIT ? 'Init plan:' : 'Sync plan:')
  printGroup('Adopt unchanged files', plan.adopt, (item) => item.key)
  printGroup('Copy source -> target', plan.copySourceToTarget, (item) => item.key)
  printGroup('Copy target -> source', plan.copyTargetToSource, (item) => item.key)
  printGroup('Delete source', plan.deleteSource, (item) => item.key)
  printGroup('Delete target', plan.deleteTarget, (item) => item.key)
  printGroup('Remove from manifest', plan.removeFromManifest, (item) => item.key)
  printGroup('Unmanaged target files (skipped)', plan.unmanagedTarget, (item) => item.key)
  printGroup('Conflicts', plan.conflicts, (item) => `${item.key} - ${item.reason}`)
}

function printGroup(label, items, format) {
  if (items.length === 0) return
  console.log(`\n${label}:`)
  for (const item of items) console.log(`  - ${format(item)}`)
}

async function validatePlannedWrites(plan) {
  const writes = [...plan.copySourceToTarget, ...plan.copyTargetToSource]
  const errors = []

  for (const item of writes) {
    const source = await readFile(item.from, 'utf8')
    const fileErrors = validateMarkdownOnly(source)
    for (const error of fileErrors) errors.push(`${item.key}: ${error}`)
  }

  if (errors.length > 0) {
    throw new Error(`Markdown-only validation failed:\n- ${errors.join('\n- ')}`)
  }
}

function validateMarkdownOnly(source) {
  const errors = []
  const markdownBody = stripFencedCode(source)
  const frontmatter = parseFrontmatter(source)
  const data = parseFrontmatterData(frontmatter)

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
  if (data.media !== undefined) {
    errors.push('media frontmatter is no longer supported')
  }
  if (data.youtubeId && data.audioSrc) {
    errors.push('youtubeId and audioSrc cannot be used together')
  }
  if (data.youtubeId && !YOUTUBE_ID_RE.test(data.youtubeId)) {
    errors.push(`invalid YouTube id: ${data.youtubeId}`)
  }
  if (data.audioSrc && !isSafeAudioSrc(data.audioSrc)) {
    errors.push(`invalid audio src: ${data.audioSrc}`)
  }
  if (data.audioSrc && !data.audioTitle?.trim()) {
    errors.push('audioTitle is required when audioSrc is set')
  }
  if (!data.audioSrc && data.audioTitle !== undefined) {
    errors.push('audioTitle requires audioSrc')
  }

  return errors
}

function stripFencedCode(source) {
  return source.replace(/(^|\n)(`{3,}|~{3,})[\s\S]*?\n\2(?=\n|$)/g, '$1')
}

function parseFrontmatter(source) {
  const open = source.match(/^---\r?\n/)
  if (!open) return ''
  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return ''
  return source.slice(open[0].length, close.index)
}

function parseFrontmatterData(frontmatter) {
  const data = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    const scalar = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/)
    if (!scalar) continue
    data[scalar[1]] = unquote(scalar[2])
  }
  return data
}

function unquote(value) {
  return value.replace(/^(['"])(.*)\1$/, '$2')
}

async function applyPlan(plan) {
  for (const item of plan.copySourceToTarget) await copyMarkdownFile(item.from, item.to)
  for (const item of plan.copyTargetToSource) await copyMarkdownFile(item.from, item.to)
  for (const item of plan.deleteSource) await rm(item.path)
  for (const item of plan.deleteTarget) await rm(item.path)
}

async function copyMarkdownFile(from, to) {
  await mkdir(dirname(to), { recursive: true })
  await copyFile(from, to)
}

async function buildManifestFromCurrentState() {
  const sourceFiles = await scanMarkdownFiles(SOURCE_ROOT)
  const targetFiles = await scanMarkdownFiles(TARGET_ROOT)
  const files = {}
  const now = new Date().toISOString()

  for (const key of allKeys(sourceFiles, targetFiles)) {
    const source = sourceFiles.get(key)
    const target = targetFiles.get(key)
    if (!source || !target || source.hash !== target.hash) continue
    files[key] = {
      sourceHash: source.hash,
      targetHash: target.hash,
      lastSyncedAt: now,
    }
  }

  return {
    version: MANIFEST_VERSION,
    sourceRoot: SOURCE_ROOT,
    targetRoot: TARGET_ROOT,
    files,
  }
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return { version: MANIFEST_VERSION, files: new Map() }
  }

  const raw = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
  if (raw.version !== MANIFEST_VERSION || !raw.files || Array.isArray(raw.files)) {
    throw new Error(`Unsupported sync manifest schema: ${MANIFEST_PATH}. Run sync with --init to create a new manifest.`)
  }

  return {
    version: raw.version,
    sourceRoot: raw.sourceRoot,
    targetRoot: raw.targetRoot,
    files: new Map(Object.entries(raw.files)),
  }
}

async function saveManifest(manifest) {
  await mkdir(dirname(MANIFEST_PATH), { recursive: true })
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

main().catch((error) => {
  console.error(error.message ?? error)
  exit(1)
})
