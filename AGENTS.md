# AGENTS.md

Guide for any agent (or human) working in this repository. Read `PLAN.md` for the
architecture and current phase; read `olk.txt` only if you need the original brief.

## Project

Personal portfolio for **Osayeed Zaber** (GitHub `Osayeidzaber`). Next.js 16 App Router,
React 19, TypeScript, Tailwind CSS 4, shadcn registry components, GSAP + ScrollTrigger,
Motion, Three.js / React Three Fiber, ogl. Deployed on Vercel. GitHub is the CMS.

## Commands (pnpm only)

```bash
pnpm dev              # local dev server, http://localhost:3000
pnpm build            # production build (runs snapshot:github first)
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest (unit)
pnpm test:e2e         # Playwright against `pnpm start` — run `pnpm build` first
pnpm hash-password    # prints an ADMIN_PASSWORD_HASH for .env.local
pnpm snapshot:github  # refresh content/github-snapshot.json (offline fallback)
```

Before calling any work done: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e`.

## Next.js 16 is not the Next.js you remember

- Docs for the installed version live in `node_modules/next/dist/docs/`. Check them
  before using an API. Key pages: `01-app/01-getting-started/08-caching.md`,
  `03-api-reference/04-functions/{revalidateTag,updateTag,cacheTag,cacheLife}.md`,
  `03-api-reference/03-file-conventions/proxy.md`.
- `cacheComponents: true`. Use `'use cache'` + `cacheLife()` + `cacheTag()`. Never read
  `cookies()`/`headers()` inside a `'use cache'` scope; wrap request-time reads in `<Suspense>`.
- `middleware.ts` is now `src/proxy.ts`.
- `revalidateTag(tag, 'max')` takes two arguments. Use `updateTag(tag)` inside server
  actions when the change must be visible immediately.

## Layout

```
content/                 site.json (published), draft.json, github-snapshot.json, uploads/
scripts/                 hash-password.ts, snapshot-github.ts
src/app/(site)/          public pages: / and /work/[slug]
src/app/admin/           login, dashboard, editors, preview (all server-gated)
src/app/api/             github/webhook, revalidate, thumb/[slug]
src/app/media/           serves content/uploads from the content repo
src/components/          registry components AS INSTALLED (React Bits at root,
                         ui/ = Aceternity + Magic UI, fancy/ = Fancy, arc/ = UI Arc)
src/components/site/     our sections, nav, footer — compose registry components here
src/components/shaders/  our own GLSL / R3F (replaces Aceternity Pro shaders)
src/components/admin/    admin UI
src/lib/content/         zod schema, read (local | GitHub), write (commit), defaults
src/lib/github/          REST + GraphQL clients, ranking, thumbnails, webhook verify
src/lib/auth/            password hash, signed session cookie, rate limit
src/lib/motion/          reduced-motion, WebGL capability, GSAP registration
tests/                   vitest
```

## Rules that matter

1. **Black only.** Ground `#000`. Tokens in `src/app/globals.css` (`--ink`, `--lift`,
   `--rule`, `--edge`, `--dust`, `--mist`, `--paper`). No hues, no colour gradients, no
   glow. Registry components must be configured to greys/white (prop colours).
2. **Never invent facts.** No fake stats, awards, employers, testimonials or GitHub
   numbers. Unknown content gets `placeholder: true` in the content file; placeholders
   are hidden on the public site and shown in admin only.
3. **Registry components stay as installed** where possible; adapt via props and
   wrappers in `src/components/site/`. If you must patch one, keep the change minimal
   and add a one-line comment `// patched: <why>` at the edit.
4. **Every component must be used meaningfully.** Don't leave installed components
   unused; don't trap effects in tiny boxes. See the matrix in `PLAN.md` §4.
5. **Motion hygiene:** GSAP via `useGSAP` or `gsap.context()` with cleanup;
   `ScrollTrigger.refresh()` after layout changes; respect `prefers-reduced-motion`;
   pause WebGL offscreen (IntersectionObserver); one render loop per canvas; check
   WebGL support and render a static fallback.
6. **Secrets:** write tokens, password hash and session secret are server-only
   (`import 'server-only'`). Never prefix them `NEXT_PUBLIC_`. Every server action
   re-checks the session — the proxy redirect is UX, not security.
7. **Saving content:** always send the last-seen `sha`; on 409 surface a conflict;
   never report success unless GitHub returned 2xx.
8. **Accessibility:** semantic landmarks, one `h1` per page, visible focus, 44px touch
   targets, nothing hover-only, alt text from content, contrast ≥ 4.5:1.
9. **Mobile is a separate composition**, not a shrunk desktop. Test at 375px.
10. Keep docs to `README.md`, `PLAN.md`, `AGENTS.md`. Update the PLAN checkboxes.

## Hard-won notes

- `reactStrictMode` is **off** on purpose: the registry WebGL components lose their context
  on StrictMode's dev-only double mount and paint a white "broken" canvas.
- The Tailwind Turbopack loader must skip `*.module.css` (see `next.config.ts`), or the UI Arc
  heatmap loses its styles.
- Never read `Date.now()`/`new Date()` during render of a prerendered route; derive times from
  data (`github.fetchedAt`) or call `await connection()` first (see `lib/auth/session.ts`).
- Registry components that take a `radius` expect a real pixel radius (`radius={999}` breaks
  the Specular Button shader).
- Keep below-the-fold chapters as `next/dynamic` imports inside their own `<Suspense>` in
  `components/site/home-view.tsx`; it keeps hydration in smaller tasks.
- Headless screenshots of WebGL need `--use-gl=angle --use-angle=swiftshader`; the Claude
  browser pane throttles animation while hidden.
- Patched registry files are marked `// patched:` — re-apply after reinstalling a component.

## Environment

See `.env.example` and `PLAN.md` §6. Local dev works with no env at all (bundled
content, public GitHub API, admin disabled with a clear message).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
