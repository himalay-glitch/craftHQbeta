# CraftHQ

The CraftHQ web app. Today it has the login page. Two people are building the next parts in parallel, each with Claude on their own computer: himalay-glitch builds the dashboard screen and shubhampatil-lab builds the modal that asks users to connect their accounts (Claude and other services).

The app is built with Astro 7: pages are `.astro` files rendered to HTML, and anything interactive is a React component that the page hydrates as an island. Astro 7 is newer than most training data, so check https://docs.astro.build before relying on an Astro API from memory.

## Stack

- Astro 7.3 with `@astrojs/react`, React 19.3, TypeScript 5 in strict mode, Node 22.12 or newer
- Pages are static by default. A route that has to run on the server sets `export const prerender = false`, and the Node adapter (`@astrojs/node`, standalone) serves it.
- Tailwind CSS 4.3, configured in CSS in `src/styles/globals.css` and compiled through `@tailwindcss/vite`. There is no `tailwind.config` file.
- Inter is self-hosted with its optical-size axis through `@fontsource-variable/inter`, imported in `src/layouts/BaseLayout.astro`
- framer-motion for animation, lucide-react for icons
- ESLint 10 with `typescript-eslint` and `eslint-plugin-react-hooks` lints `.ts` and `.tsx` files; `astro check` type-checks `.astro` files
- `astro.config.mjs` holds the integrations, the adapter and the redirects (today `/` goes to `/login`)
- No environment variables are read yet (see `.env.example`)

Commands: `npm ci` to install, `npm run dev` (http://localhost:4321), `npm run lint`, `npm run build` (runs `astro check`, then builds), `npm start` to serve the build.

## Folder conventions

- Pages are `src/pages/<route>.astro` or `src/pages/<route>/index.astro`. API routes are `src/pages/api/<name>.ts`: they export handlers such as `POST`, plus `export const prerender = false`.
- Every page wraps its content in `src/layouts/BaseLayout.astro` (document, font, global CSS, metadata, icons). Signed-in screens will wrap theirs in `src/layouts/AppLayout.astro`, the app shell with the sidebar.
- Interactive UI is React. Components live in `src/components/`: one PascalCase `.tsx` file per component, with named exports (`export function LoginForm`). A page hydrates one with a client directive: `client:load` when it has to work straight away (forms, the headline bot), `client:visible` or `client:idle` when it can wait. Without a directive, a React component renders to static HTML with no JavaScript. Astro ignores `"use client"`, so don't add it.
- Islands don't share React state. Things that share state, like a button and the modal it opens, belong in one island.
- Markup with no interactivity can be an `.astro` component instead of React.
- Import from `src/` through the `@/` alias, for example `@/components/icons`.
- Types live in `src/types/<area>.ts`.
- Style with Tailwind utility classes and the colour tokens defined in `globals.css` (`bg-background`, `text-foreground`, `text-muted-foreground`, `var(--cta)`, `var(--field-bg)`). The site is light-only (`data-theme="light"` in `src/layouts/BaseLayout.astro`). Keep styling in your own files; new tokens or classes in `globals.css` are a shared-file change.
- Images are plain `<img>` tags with `width` and `height`. Static files live in `public/` and are referenced by absolute path, for example `/images/bots/builder.webp`. Videos ship as `.webm` and `.mp4` pairs.
- Blender files and renders are in `design/`; plans and reference screenshots are in `docs/`. Rendered frame sequences are gitignored.

## Design system

All UI follows `DESIGN.md`. Read the sections that apply before building or changing any screen or component. When the code and `DESIGN.md` disagree, `DESIGN.md` wins: fix the code if it's in your own area (if it isn't, tell its owner), or change the document first in its own shared-file PR.

## Who owns what

Only the owner edits an area. Importing code from the other person's area is fine; editing it is not.

| Area | Owner | Paths |
|---|---|---|
| App shell (sidebar and signed-in layout) | himalay-glitch | `src/layouts/AppLayout.astro`, `src/components/shell/` |
| Dashboard screen | himalay-glitch | `src/pages/dashboard/`, `src/components/dashboard/`, `src/types/dashboard.ts`, `public/dashboard/` |
| Connect-accounts modal | shubhampatil-lab | `src/components/connect-accounts/`, `src/pages/api/connections/`, `src/types/connections.ts`, `public/connect-accounts/` |
| Login page (existing) | himalay-glitch | `src/pages/login.astro`, `src/components/LoginForm.tsx`, `src/components/RebusBot.tsx`, `src/components/icons.tsx`, `src/pages/api/auth/`, `src/types/auth.ts`, `public/images/bots/`, `public/videos/bots/` |
| Design sources and docs | himalay-glitch | `design/`, `docs/` |
| Shared: changed only in a separate, announced PR | both | `package.json`, `package-lock.json`, `astro.config.mjs` (integrations, adapter, routing and redirects), `src/layouts/BaseLayout.astro`, `src/styles/globals.css`, `src/components/ui/` (shared components, `DESIGN.md` §15 decision 5), `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `.githooks/`, `CLAUDE.md`, `DESIGN.md`, and any file in `public/` outside the folders above |

One exception: a PR that needs a new environment variable may add its placeholder line to `.env.example`.

Branch names start with `himalay/` or `shubham/`.

### Where the two areas meet

The modal is meant to open from the dashboard, so the areas touch at one point:

- shubhampatil-lab exports the modal as `ConnectAccountsModal` from `src/components/connect-accounts/index.ts`, with the props `open: boolean` and `onClose: () => void`.
- himalay-glitch renders it from inside one of the dashboard's own React islands (for example the setup checklist in `src/components/dashboard/`), which holds the open state, because separate islands don't share state. Nobody else edits files inside `src/components/connect-accounts/`.
- Changing those props is an announced change: agree on it first, then the modal owner ships it, and the dashboard owner updates their side in a follow-up PR.

Pointing `/` at the dashboard after sign-in (the login form sends people to `/`, which currently redirects to `/login`) means editing `astro.config.mjs`, so it goes in its own shared-file PR.

## First-time setup on each computer

```sh
git clone https://github.com/himalay-glitch/craftHQbeta.git
cd craftHQbeta
git config core.hooksPath .githooks
npm ci
```

It needs Node 22.12 or newer (`node --version`). The `core.hooksPath` setting is stored per computer. Without it, the hook that blocks pushes to `main` never runs.

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
