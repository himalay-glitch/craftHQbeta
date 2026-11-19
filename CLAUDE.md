# CraftHQ

The CraftHQ web app. Today it has the login page. Two people are building the next parts in parallel, each with Claude on their own computer: himalay-glitch builds the dashboard screen and shubhampatil-lab builds the modal that asks users to connect their accounts (Claude and other services).

Next.js 16 has breaking changes from older versions. Follow `AGENTS.md` and read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.

## Stack

- Next.js 16.4 (App Router in `src/app/`), React 19.3, TypeScript 5 in strict mode
- Tailwind CSS 4.3, configured in CSS in `src/app/globals.css` and compiled through `@tailwindcss/turbopack`. There is no `tailwind.config` file.
- framer-motion for animation, lucide-react for icons
- ESLint 9 with `eslint-config-next`
- `next.config.ts` turns on `cacheComponents` and `partialPrefetching`, and redirects `/` to `/login`
- No environment variables are read yet (see `.env.example`)

Commands: `npm ci` to install, `npm run dev`, `npm run lint`, `npm run build`.

## Folder conventions

- Pages are `src/app/<route>/page.tsx`. API routes are `src/app/api/<name>/route.ts`.
- Components live in `src/components/`: one PascalCase `.tsx` file per component, with named exports (`export function LoginForm`). Files that use state, effects or browser APIs start with `"use client"`.
- Import from `src/` through the `@/` alias, for example `@/components/icons`.
- Types live in `src/types/<area>.ts`.
- Style with Tailwind utility classes and the colour tokens defined in `globals.css` (`bg-background`, `text-foreground`, `text-muted-foreground`, `var(--cta)`, `var(--field-bg)`). The site is light-only (`data-theme="light"` in `src/app/layout.tsx`). Keep styling in your own files; new tokens or classes in `globals.css` are a shared-file change.
- Images use `next/image` with `unoptimized`. Static files live in `public/` and are referenced by absolute path, for example `/images/bots/builder.webp`. Videos ship as `.webm` and `.mp4` pairs.
- Blender files and renders are in `design/`; plans and reference screenshots are in `docs/`. Rendered frame sequences are gitignored.

## Design system

All UI follows `DESIGN.md`. Read the sections that apply before building or changing any screen or component. When the code and `DESIGN.md` disagree, `DESIGN.md` wins: fix the code, or change the document first in its own shared-file PR.

## Who owns what

Only the owner edits an area. Importing code from the other person's area is fine; editing it is not.

| Area | Owner | Paths |
|---|---|---|
| Dashboard screen | himalay-glitch | `src/app/dashboard/`, `src/components/dashboard/`, `src/types/dashboard.ts`, `public/dashboard/` |
| Connect-accounts modal | shubhampatil-lab | `src/components/connect-accounts/`, `src/app/api/connections/`, `src/types/connections.ts`, `public/connect-accounts/` |
| Login page (existing) | himalay-glitch | `src/app/login/`, `src/components/LoginForm.tsx`, `src/components/RebusBot.tsx`, `src/components/icons.tsx`, `src/app/api/auth/`, `src/types/auth.ts`, `public/images/bots/`, `public/videos/bots/` |
| Design sources and docs | himalay-glitch | `design/`, `docs/` |
| Shared: changed only in a separate, announced PR | both | `package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/app/globals.css`, `next.config.ts` (routing and redirects), `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `.githooks/`, `CLAUDE.md`, `DESIGN.md`, `AGENTS.md`, and any file in `public/` outside the folders above |

One exception: a PR that needs a new environment variable may add its placeholder line to `.env.example`.

Branch names start with `himalay/` or `shubham/`.

### Where the two areas meet

The modal is meant to open from the dashboard, so the areas touch at one point:

- shubhampatil-lab exports the modal as `ConnectAccountsModal` from `src/components/connect-accounts/index.ts`, with the props `open: boolean` and `onClose: () => void`.
- himalay-glitch renders it from the dashboard code. Nobody else edits files inside `src/components/connect-accounts/`.
- Changing those props is an announced change: agree on it first, then the modal owner ships it, and the dashboard owner updates their side in a follow-up PR.

Pointing `/` at the dashboard after sign-in (the login form sends people to `/`, which currently redirects to `/login`) means editing `next.config.ts`, so it goes in its own shared-file PR.

## First-time setup on each computer

```sh
git clone https://github.com/himalay-glitch/craftHQbeta.git
cd craftHQbeta
git config core.hooksPath .githooks
npm ci
```

The `core.hooksPath` setting is stored per computer. Without it, the hook that blocks pushes to `main` never runs.

## TEAM RULES

1. Never commit or push to main. Every task starts with: `git checkout main && git pull`, then `git checkout -b <name>/<task>` (e.g. `alex/navbar`).
2. Only edit files in your owner's area. If a task needs a shared file or the other person's area, STOP and ask the human. Shared-file changes go in their own small PR.
3. Never: force push, rebase a pushed branch, `git reset --hard`, `git clean`, delete branches, `git push --no-verify`, or `git add .` with unrelated changes.
4. Never add, remove, or upgrade npm packages without asking. Dependency changes go in their own PR. Use `npm ci` (not `npm install`) after pulling so the lockfile isn't rewritten.
5. Before committing: run lint and build, show the human the diff, commit only files related to the task.
6. Before opening a PR: `git fetch` then `git merge origin/main` into your branch (merge, not rebase). Resolve conflicts only in your own area; if a conflict touches the other person's code, stop and ask.
7. Open PRs with `gh pr create` and a clear description. Never merge your own PR — the other person reviews it.
8. Never commit secrets. .env stays local; new variables get added to .env.example.
9. Session notes go in SESSION_LOG.md, which is gitignored and never committed.
