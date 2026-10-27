# Build plan — Osayeed Zaber portfolio

Source brief: `olk.txt` (the full spec). Visual direction: the Claude Design canvas
"Osayeed Zaber — Portfolio Direction" (https://claude.ai/artifact/ETGsH52jjE9SWEfoZmnYRe),
direction **Black Press**. This file is the working plan; tick boxes as work lands.

## 1. Product in one paragraph

A single long-scroll portfolio (`/`) told as numbered chapters (00 Cover → 08 Contact),
project case-study pages (`/work/[slug]`), and a password-protected admin (`/admin`).
GitHub is both the data source (repos, languages, activity) and the CMS backend: the
admin commits a JSON content file to the site's own repository, and the site
revalidates its cache so changes appear in about a minute without a redeploy.

## 2. Design system (Black Press)

| Token | Value | Use |
|---|---|---|
| `--ink` | `#000000` | Page ground. Everything. |
| `--lift` | `#0A0A0A` | Raised surfaces, inputs |
| `--rule` | `#1F1F1F` | Hairlines, borders |
| `--edge` | `#3A3A3A` | Strong borders, secondary buttons |
| `--dust` | `#8A8A8A` | Secondary text (6.5:1 on black) |
| `--mist` | `#BDBDBD` | Body copy on black |
| `--paper` | `#F2F2F2` | Primary text, primary buttons, active states |

- **No hue anywhere.** Emphasis = weight, width, italic serif, inversion (paper fill + black text).
- Type: **Bricolage Grotesque** (variable wght/wdth/opsz; display + UI), **Instrument Serif**
  italic (asides, one word per heading), **JetBrains Mono** (folios, labels, data).
- Radii: 0 for type blocks and rules, 999 for pills/buttons, 16 for media.
- Motion: fast 180ms, base 420ms, slow 900ms; ease `cubic-bezier(.16,1,.3,1)`;
  stagger 40ms/letter, 80ms/line. All motion off or reduced under `prefers-reduced-motion`.
- Grid: 12 col, 24 gutter, margin `clamp(16px, 5vw, 64px)`; breakpoints 640/1024/1440.
- Every section starts with a folio row: `NN — Name` left, context right, hairline above.

## 3. Architecture

```
Next.js 16 App Router (cacheComponents + partialPrefetching on)
├─ Public pages: static shell + 'use cache' data (cacheTag 'content' | 'github')
├─ /admin: Suspense-wrapped, cookie-gated, server actions only
├─ /api/github/webhook   → verify HMAC → revalidateTag('github','max')
├─ /api/revalidate       → secret-guarded manual refresh
├─ /media/[...path]      → serves uploaded files from the content repo (immutable cache)
└─ /api/thumb/[slug]     → same-origin project thumbnail (WebGL-safe, no open proxy)
```

### Content (single source of truth)
- `content/site.json` — published content, validated by zod (`src/lib/content/schema.ts`).
- `content/draft.json` — admin draft; preview at `/admin/preview`.
- `content/uploads/*` — images, résumé PDF (content-hashed names).
- Read path: if `GITHUB_CONTENT_REPO` + `GITHUB_CONTENT_TOKEN` set → GitHub Contents API
  (cached, tag `content`); else the file bundled at build. Invalid remote JSON falls back
  to the bundled copy and logs, never crashes the page.
- Write path (admin): server action → validate → `PUT /repos/:repo/contents/:path` with the
  last-seen `sha`. GitHub returns 409 on a stale sha → UI shows a conflict, never overwrites.
  On success → `updateTag('content')`. Vercel also redeploys on the commit (belt and braces).
- History/restore: list commits for `content/site.json`, restore = commit old blob as new.

### GitHub data
- `src/lib/github/*`: REST for user, repos, languages, README; GraphQL
  `contributionsCollection` for the heatmap when `GITHUB_TOKEN` is present.
- Without a token the heatmap falls back to **public events (last 90 days)** and says so.
- Ranking (`rank.ts`): exclude forks, archived, the profile-README repo; score by
  description, homepage, recency, size, stars, topics. Admin overrides win.
- Cache: `cacheLife({ revalidate: 3600 })`, tag `github`; webhook invalidates on push/repo
  events. Fetch failures fall back to `content/github-snapshot.json` (refreshed by
  `pnpm snapshot:github`, run in `prebuild`).
- Thumbnails (never fabricated): admin upload → live site's `og:image` → black typographic
  card. (GitHub's own repo cards were dropped: they are white and fight the black page.)
  Current thumbnails are real screenshots of the live sites captured 27 Oct 2026.

### Auth
- `ADMIN_PASSWORD_HASH` (scrypt, produced by `pnpm hash-password`), `SESSION_SECRET`.
- Session = HMAC-signed cookie `oz_session` (httpOnly, Secure, SameSite=Strict, 8h).
- `src/proxy.ts` redirects unauthenticated `/admin/*` to `/admin/login`; **every** server
  action re-verifies the session (proxy is not the security boundary).
- Login rate limit: per-IP sliding window (in-memory, per instance) + constant-time compare.
- Write tokens live only in server env. Nothing secret is imported by client modules
  (`server-only` guards).

## 4. Page map → components (all 23 used; 2 Aceternity Pro blocks replaced)

| Chapter | Component(s) | Role |
|---|---|---|
| Nav | Motion layout pill, Letter Swap | Floating pill, active-section indicator |
| 00 Cover | **Light Tunnel** (bg), **Variable Font & Cursor** (name), **Text Loop** (roles), **Shiny Text** (status), **Specular Button** (CTAs) | |
| 01 About | **Text Animate** (essay), **Reflective Card** (portrait/ID card), **Animated Content** (reveals) | |
| 02 Work | **Flex Carousel** (WebGL, wide landscape cards with original-color screenshots), **Tooltip Card** (stack chips), **Gradient Text** (featured mark, greys) | User-approved color exception for project media |
| 02b Showcase | **MacBook Scroll** (real screenshot) | Corso Velle, using its V2 repository |
| Case pages | **Container Scroll Animation** | `/work/[slug]`: the screen settles flat as you scroll |
| 03 Toolkit | **Logo Loop** + **Marquee** (type belts), **Micro Slats** (bg) | |
| 04 Ledger | **Activity Heatmap** (UI Arc, grey scale) | Real data only |
| 05 Experience | GSAP ScrollTrigger spine | |
| 06 Recognition | Tooltip Card | Hidden when empty |
| 07 Workbench | Local JSON formatter, text helpers and URL codec; optional visual lab with **Elastic Mesh**, **Dither Veil**, **Fuzzy Text**, **Jelly Radio** (picker), custom R3F ink shader | Lab mounts only when opened |
| 08 Contact | **Background Gradient Animation** (greys), Letter Swap links, copy-email | |
| Footer | Custom big-type footer (replaces Aceternity Pro footer), Letter Swap ping-pong | |

Replacements (documented, Pro-only, 401 from registry): Aceternity **Shaders** →
`src/components/shaders/ink-press.tsx` (R3F + GLSL); Aceternity **Footers** →
`src/components/site/footer.tsx` in the "footer with big text" pattern.

## 5. Phases

- [x] 0. Discovery, brief read, GitHub data inspected, registries verified
- [x] 1. Claude Design canvas (system + 15 artboards), black-only revision approved
- [x] 2. Scaffold Next 16 + Tailwind 4 + shadcn; install all registry components
- [x] 3. Tokens/fonts/globals, layout, nav, reduced-motion + WebGL capability helpers
- [x] 4. Content schema + seed `content/site.json` (real data, placeholders flagged)
- [x] 5. GitHub layer (REST, GraphQL, ranking, snapshot, webhook, thumbnails)
- [x] 6. Public chapters 00–08 + footer, each with its components
- [x] 7. `/work/[slug]`, metadata, OG image, sitemap, robots, JSON-LD
- [x] 8. Admin: login, session, proxy, sections editor, drag reorder, uploads,
       draft/preview/publish, conflicts, history/restore, GitHub import
- [x] 9. Tests (vitest: schema, ranking, session, webhook signature), typecheck, lint, build
- [x] 10. Browser QA desktop + phone, reduced motion, no-WebGL fallback, Lighthouse
- [x] 11. README (setup, env, publishing flow), security headers in `next.config.ts`, final audit
- [ ] 12. Owner setup:
  - [x] GitHub repository `Osayeidzaber/portfolio-v2` with setup and publishing README
  - [x] Enhanced repository README with Black Press cover, project previews, navigation, and architecture diagram
  - [ ] Vercel project, env vars, webhook, production password
- [ ] 13. Next: "lite" mode for low-power phones to lift mobile Lighthouse (currently ~60)
- [x] 14. Portrait hero composition, larger color carousel, Corso Velle V2 showcase,
       refreshed repository mappings, server-rendered README case studies with offline
       copies, useful browser tools + optional visual lab, experience and footer refresh.
       Validation: typecheck, lint, 28 unit tests, production build, and 31 browser
       tests passed; 3 browser checks skipped (two signed-in admin checks without
       E2E_ADMIN_PASSWORD, plus mobile keyboard flow). Portrait checked at 375×812
       and 1024×1800; production carousel/footer screenshots inspected.

- [x] Deployment URL handling: normalize bare domains to HTTPS before metadata generation; regression coverage for URL configuration.

## 6. Environment variables

| Name | Required | Purpose |
|---|---|---|
| `GITHUB_USERNAME` | yes (default `Osayeidzaber`) | Whose repos to show |
| `GITHUB_TOKEN` | recommended | Read-only, raises rate limit, enables contribution calendar |
| `GITHUB_CONTENT_REPO` | for admin | `owner/name` of this site's repo |
| `GITHUB_CONTENT_BRANCH` | no (default `main`) | Branch the admin commits to |
| `GITHUB_CONTENT_TOKEN` | for admin | Fine-grained PAT, *Contents: read & write* on that repo only |
| `GITHUB_WEBHOOK_SECRET` | for webhook | HMAC secret for `/api/github/webhook` |
| `ADMIN_PASSWORD_HASH` | for admin | `pnpm hash-password` output |
| `SESSION_SECRET` | for admin | ≥32 random bytes |
| `REVALIDATE_SECRET` | no | Manual refresh endpoint |
| `NEXT_PUBLIC_SITE_URL` | yes in prod | Canonical URL (`https://osayeed.dev`) |

## 7. Known risks / decisions

- In-memory rate limiting is per serverless instance; acceptable for one admin, documented.
- GitHub contribution calendar needs a token; without it the heatmap is explicitly
  labelled as "public events, last 90 days".
- Uploaded media is served via `/media` from the repo so it is live before the redeploy.
- The initial admin password mentioned in the brief was not in the file; the owner sets
  it via `pnpm hash-password` → env var.
- Achievements and some roles are unknown; they are editable placeholders that never render
  publicly while flagged `placeholder: true`.
