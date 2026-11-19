# Page Topology — app.crafthq.ai/login

Source: https://app.crafthq.ai/login (Next.js app, plain hand-written CSS, no Tailwind, no webfonts).
Extracted 2026-11-18. Raw data: `dom-extract.json`, `css-extract.json`, `site-css.css`, `login-js.json`.

## Layout

```
html[data-theme="dark"]          height:100%; theme set pre-hydration from localStorage('crafthq-theme'), default "dark"
└─ body                          bg var(--bg) #1b1a19, color var(--text), font var(--font), line-height 1.55
   └─ div.login-wrap             display:grid; place-items:center; min-height:100vh; padding:24px
      └─ div.login-card          380px max, centered (box at 1440x900: x530 y272 w380 h355)
         ├─ div.login-brand      logo svg (28x28) + "CraftHQ"
         ├─ h1.login-title       "Sign in" (serif)
         ├─ p.login-sub          helper copy
         └─ form.login-form      (client component LoginForm)
            ├─ label.sr-only + input.input[type=email]
            ├─ label.sr-only + input.input[type=password]
            ├─ div.form-error[role=alert]   (only when an error exists)
            └─ button.btn.login-submit
```

No fixed or sticky layers, no z-index stacking, no scroll container. The page never scrolls at desktop or mobile sizes.

## Sections

| # | Name | Interaction model | Component |
|---|------|-------------------|-----------|
| 1 | Login card (brand, title, sub) | static | `src/app/login/page.tsx` |
| 2 | Login form | click/submit-driven (async fetch, disabled while pending, error alert) | `src/components/LoginForm.tsx` |
| — | Logo mark | static SVG with drop-shadow | `src/components/icons.tsx` → `CraftHQLogo` |

## Routing

- `/login` is the page.
- `/` on the live site is the authenticated app. In the clone it redirects to `/login`.
- `POST /api/auth/login` is mocked and always returns 401 (no backend, per scope).
