# my-blog

Next.js 기반 MDX 블로그 템플릿입니다. 한국어 검색, 토픽 탐색, Obsidian 스타일 MDX 문법, 오디오/영상 노트 기능을 지원합니다.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Velite for MDX content
- MiniSearch + es-hangul for Korean search
- lite-youtube-embed for YouTube notes

## Getting Started

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm start
```

## Content

MDX files live directly under `content/`.

```txt
content/
├── home.mdx
├── 사용 안내.mdx
├── 내 글.mdx
└── notes/
    └── 하위 폴더 글.mdx
```

The file path becomes the URL path. Spaces are converted to hyphens.

- `content/내 글.mdx` -> `/내-글`
- `content/notes/하위 폴더 글.mdx` -> `/notes/하위-폴더-글`

The file name is used as the post title.

```mdx
---
draft: false
base: [Next.js, MDX]
---

본문...
```

## MDX Features

Wiki links:

```mdx
[[사용 안내]]
[[사용 안내|가이드]]
```

Highlight:

```mdx
==highlighted text==
```

Callouts:

```mdx
> [!note] Title
> Content
```

YouTube:

```mdx
<YouTubeEmbed id="VIDEO_ID" />
```

Audio:

```mdx
<audio controls src="https://example.com/audio.mp3" />
```

Chapters:

```mdx
## 0:00 Intro
## 1:30 Main section
```

Cues:

```mdx
▶ 0:05 This paragraph is tied to the media timestamp.
```

## Search And Topics

- Global search opens with `Ctrl+/`.
- Search index is served from `/search-index.json`.
- `base` frontmatter values become topics.
- Topic pages are available at `/topics/[topic]`.

## Configuration

Customize site metadata, excluded pages, footer links, and recent topic sources in `site.config.ts`.

Customize colors and UI tokens in `app/globals.css`.

## License

MIT
