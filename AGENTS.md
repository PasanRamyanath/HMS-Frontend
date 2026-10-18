# HMS-Frontend — Agent Guidelines & Design Mandate

## 1. Frontend Architecture
- **Stack**: React 19 + Vite + TypeScript + Tailwind CSS v4.
- **Subsystems**:
  - `src/qr/`: Zero-login contactless guest ordering, room service, and live folio PWA.
  - `src/staff/`: Smartphone/tablet KDS, bar BOT, waiter POS, and housekeeping runner.
  - `src/admin/`: Full multi-tenant hotel PMS, tape chart, banquets, inventory/stores, and super-admin portal.

## 2. Apple Human Interface Guidelines (HIG) & Liquid Glass Design System
- Frosted glass vibrancy surfaces: `backdrop-filter: blur(24px) saturate(180%)` with specular border (`--apple-glass-border`).
- SF Pro optical scale and `tabular-nums` for all financial figures, LKR currency, and elapsed timers.
- Continuous squircle geometry (`10px` / `16px` / `24px` / `9999px`).
- Fluid spring physics: `cubic-bezier(0.22, 1, 0.36, 1)` with `active:scale-[0.97]`.
- Minimum interactive touch targets >= 44x44pt.
- Support `@media (prefers-reduced-transparency: reduce)` and `@media (prefers-reduced-motion: reduce)`.

## 3. Anti-Noise & Code Quality Standards
- No arbitrary LOC caps: Keep code human-understandable, accessible, and maintainable.
- Ponytail Anti-Bloat: Eliminate speculative abstractions and unused code while strictly preserving Apple HIG styling, Liquid Glass vibrancy, and touch targets.
- Zero `console.log`, `console.error`, or `debugger` statements (`suspicious.noConsole: "error"` in Biome).
- Zero dead components, unused hooks, or phantom imports (`npx knip`).
- Maximum cognitive complexity <= 12.


## 4. Step Protocol & Git Push Gate
- Each frontend step corresponds to `plan.md` in root and `PROGRESS.md` in this repository.
- Verify using: `npx biome check . && npx knip && npm test`.
- Mark step checkbox as `- [x]` in `PROGRESS.md` and root `plan.md`.
- Commit with conventional commit message `feat(step-XXX): ...` and push to `origin main`.
