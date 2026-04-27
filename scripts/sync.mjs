import { readdir, readFile, writeFile, copyFile, unlink, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { argv, stdin, stdout } from 'node:process';
import readline from 'node:readline/promises';

// 본인 환경에 맞게 경로 수정해주세요.
const VAULT_PUBLISH  = 'C:/보관소/지정폴더';         // 보관소 내 지정 폴더 절대 위치
const VERCEL_CONTENT = 'C:/vercel-blog-searchbox/content/post';    // Vercel blog content 폴더 절대 위치
const MANIFEST_PATH  = 'C:/vercel-blog-searchbox/.sync-state.json'; // 동기화 상태 파일 (gitignore 권장)

const AUTO_YES = argv.includes('--yes');
const MTIME_TOLERANCE_MS = 1000;

const LABEL = {
    'add':               '신규 발행 → vercel에 추가',
    'update':            '내용 변경 → vercel 갱신',
    'delete-publish':    'vercel에서 내림 → _publish에서도 삭제',
    'delete-vercel':     '_publish에서 사라짐 → vercel에서도 삭제',
    'warn-vercel-newer': 'vercel이 더 최신 (수동 편집?) → 건너뜀',
    'warn-orphan':       'vercel에만 존재 (추적된 적 없음) → 건너뜀',
};

async function main() {
    const manifestSet = new Set(await loadManifest());
    await mkdir(VERCEL_CONTENT, { recursive: true });

    const publishSet = new Set(
        (await readdir(VAULT_PUBLISH))
            .filter(f => f.endsWith('.md'))
            .map(f => f.replace(/\.md$/, ''))
    );
    const vercelSet = new Set(
        (await readdir(VERCEL_CONTENT))
            .filter(f => f.endsWith('.mdx'))
            .map(f => f.replace(/\.mdx$/, ''))
    );

    const actions = [];
    const allNames = new Set([...publishSet, ...vercelSet, ...manifestSet]);

    for (const name of allNames) {
        const inPublish  = publishSet.has(name);
        const inVercel   = vercelSet.has(name);
        const inManifest = manifestSet.has(name);

        if (inPublish && inVercel) {
            const publishStat = await stat(join(VAULT_PUBLISH, `${name}.md`));
            const vercelStat  = await stat(join(VERCEL_CONTENT, `${name}.mdx`));
            if (publishStat.mtimeMs > vercelStat.mtimeMs + MTIME_TOLERANCE_MS) {
                actions.push({ type: 'update', name });
            } else if (vercelStat.mtimeMs > publishStat.mtimeMs + MTIME_TOLERANCE_MS) {
                actions.push({ type: 'warn-vercel-newer', name });
            }
        } else if (inPublish && !inVercel && !inManifest) {
            actions.push({ type: 'add', name });
        } else if (inPublish && !inVercel && inManifest) {
            actions.push({ type: 'delete-publish', name });
        } else if (!inPublish && inVercel && inManifest) {
            actions.push({ type: 'delete-vercel', name });
        } else if (!inPublish && inVercel && !inManifest) {
            actions.push({ type: 'warn-orphan', name });
        }
    }

    if (actions.length === 0) {
        console.log('변경 사항 없음.');
        await saveCurrentManifest(publishSet, vercelSet);
        return;
    }

    console.log('계획:');
    for (const a of actions) console.log(`  [${LABEL[a.type]}] ${a.name}`);

    if (!AUTO_YES) {
        const rl = readline.createInterface({ input: stdin, output: stdout });
        const ans = await rl.question('진행할까? [y/N] ');
        rl.close();
        if (ans.trim().toLowerCase() !== 'y') {
            console.log('취소됨.');
            return;
        }
    }

    for (const a of actions) {
        const publishPath = join(VAULT_PUBLISH,  `${a.name}.md`);
        const vercelPath  = join(VERCEL_CONTENT, `${a.name}.mdx`);
        switch (a.type) {
            case 'add':               await copyFile(publishPath, vercelPath); console.log(`  + vercel에 추가: ${a.name}`); break;
            case 'update':            await copyFile(publishPath, vercelPath); console.log(`  ↻ vercel 갱신: ${a.name}`); break;
            case 'delete-publish':    await unlink(publishPath);                console.log(`  - _publish에서 삭제: ${a.name}`); break;
            case 'delete-vercel':     await unlink(vercelPath);                 console.log(`  - vercel에서 삭제: ${a.name}`); break;
            case 'warn-vercel-newer': console.warn(`  ! vercel이 더 최신 (수동 편집?): ${a.name}`); break;
            case 'warn-orphan':       console.warn(`  ! vercel에만 존재: ${a.name}`); break;
        }
    }

    const finalPublish = new Set(
        (await readdir(VAULT_PUBLISH)).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))
    );
    const finalVercel = new Set(
        (await readdir(VERCEL_CONTENT)).filter(f => f.endsWith('.mdx')).map(f => f.replace(/\.mdx$/, ''))
    );
    await saveCurrentManifest(finalPublish, finalVercel);
    console.log('완료.');
}

async function loadManifest() {
    if (!existsSync(MANIFEST_PATH)) return [];
    try {
        const obj = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
        return Array.isArray(obj.files) ? obj.files : [];
    } catch {
        return [];
    }
}

async function saveCurrentManifest(publishSet, vercelSet) {
    const files = [...publishSet].filter(n => vercelSet.has(n)).sort();
    await writeFile(MANIFEST_PATH, JSON.stringify({ files }, null, 2), 'utf8');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
