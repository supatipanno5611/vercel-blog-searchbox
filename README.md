# my-blog

Next.js 기반의 한국어 블로그/위키 템플릿입니다. MDX 콘텐츠, 한국어 전문 검색, Obsidian 스타일 문법을 지원합니다.

## 기술 스택

- **Next.js 16** (App Router, 정적 사이트 생성)
- **React 19** + **TypeScript**
- **Velite** — MDX 콘텐츠 관리
- **MiniSearch** + **es-hangul** — 한국어 초성 분해 전문 검색
- **Spoqa Han Sans Neo** 폰트

## 시작하기

```bash
npm install
npm run dev
```

빌드 시 Velite가 자동으로 먼저 실행됩니다 (`prebuild` 훅).

```bash
npm run build
npm start
```

## 콘텐츠 구조

```
content/
├── posts/          # 블로그 글 (MDX)
│   └── **/*.mdx
└── pages/          # 특수 페이지 (MDX)
    ├── home.mdx    # 메인 페이지 소개문
    ├── guide.mdx   # 가이드 페이지
    └── contributor.mdx  # 기여자 페이지
```

### 글 작성

`content/posts/` 하위에 MDX 파일을 생성합니다. **파일명이 곧 글 제목**입니다.

```mdx
---
draft: false          # true이면 빌드에서 제외
base: [주제어, 태그]  # 관련 글 연결 및 검색에 사용
---

본문 내용...
```

폴더 구조가 URL 경로가 됩니다. 예: `content/posts/개발/Next.js.mdx` → `/개발/Next.js`

## MDX 확장 문법

### 위키링크

```
[[페이지명]]
[[페이지명|표시텍스트]]
```

### 강조 (하이라이트)

```
==강조할 텍스트==
```

### 콜아웃 블록 (Obsidian 스타일)

```
> [!note] 제목
> 내용

> [!tip]
> 제목 없이도 사용 가능
```

지원 타입: `note`, `tip`, `info`, `warning`, `danger`, `error`, `bug`, `success`, `question`, `failure`, `example`, `quote`, `abstract`, `summary`, `todo`, `caution`, `hint`, `important`

## 검색

- 메인 페이지의 검색창 또는 글 읽기 화면에서 `Ctrl+/`로 검색 오버레이 실행
- 검색 인덱스는 빌드 시 생성되어 `/search-index.json`으로 제공
- **한국어 초성 분해** 지원 — 예: "ㄴㄷ"로 "나도" 검색 가능
- 퍼지 매칭 + 접두사 매칭 + 제목 가중치 적용

### 검색 필터

| 필터 | 설명 |
|------|------|
| 전체 | 제목 + 본문 + 주제어 |
| 제목만 | 글 제목 |
| 본문만 | 글 본문 |
| 주제어만 | `base` 필드 태그 |

### 키보드 단축키

| 키 | 동작 |
|----|------|
| `Ctrl+/` | 검색 열기 |
| `↑` / `↓` | 결과 이동 |
| `←` / `→` | 필터 변경 |
| `Enter` | 선택한 글로 이동 |
| `Esc` | 검색 닫기 |

## 관련 글

글의 `base` 필드에 같은 주제어가 포함된 글이 있으면 글 하단에 자동으로 표시됩니다.

## 라이선스

MIT
