# Behaviors — app.crafthq.ai/login

## Scroll sweep
- The page doesn't scroll (content fits within 900px and 844px viewports).
- No smooth-scroll library (no `.lenis` / locomotive classes), no scroll-snap, no scroll-triggered animation.

## Hover sweep
- `.btn` (Sign in): **no hover rule** in the stylesheet. Computed `transition: all` resolves to 0s, so there's no animation.
- Inputs: no hover rule.
- No other interactive elements on the page.

## Focus states (from site CSS + computed check)
- `.input:focus` → `border-color: color-mix(in srgb, var(--accent) 55%, var(--border))` (computed `color(srgb 0.588 0.21 0.21)`), `outline: none`
- `.input:focus-visible` → `outline: 2px solid var(--accent)`, `outline-offset: 1px` (text inputs are always focus-visible, so clicking shows the outline too)
- Global `:focus-visible` → `outline: 2px solid var(--accent)`, `outline-offset: 2px` (applies to the button on keyboard focus)
- Reference: `docs/design-references/login-card-focus-email.png`

## Form behavior (from the page's JS chunk `0f_rcbfsssop2.js`)
- Controlled inputs: email (`type=email`, `autocomplete=email`, placeholder `you@example.com`) and password (`type=password`, `autocomplete=current-password`, placeholder `Password`). Neither input is `required`.
- On submit: `preventDefault`; if already pending, ignore. Set pending, clear the error.
- `POST /api/auth/login` with JSON `{ email, password }`.
  - `ok` → `router.push("/")` then `router.refresh()`
  - `429` → `Too many attempts — try again in ${n} seconds.` (or `a few minutes` when `retry_after_seconds` isn't a number)
  - other → `body.error ?? "sign-in failed"`
  - fetch throws → `network error — try again`
- While pending, the button is `disabled` → `.btn:disabled { opacity: .55; cursor: default }`
- The error renders as `<div class="form-error" role="alert" data-testid="login-error">` between the password input and the button: `color: var(--danger) #b91c1c; margin-top: 8px; font-size: 12.5px`

## Theme
- An inline head script reads `localStorage['crafthq-theme']`. `light` or `dark` is applied as `html[data-theme]`; anything else falls back to `dark`.
- The page has no toggle, but both token sets exist (see the globals.css port).

## Responsive sweep
- No media queries target login elements.
- 1440: card 380px wide, centered.
- 768: same as desktop.
- 390: card is `width: 100%` inside 24px padding → 342px wide (x=24); inner content 284px. The helper copy still wraps to 2 lines.
