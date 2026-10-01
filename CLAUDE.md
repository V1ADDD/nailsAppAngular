# Nails App (mock)

A web app where **nail masters sell their services**. For now it is **frontend only**: all data comes from typed mock services, and there is no backend. The UI is implemented from the user's **Figma design**. Features and the domain model get added here as screens are built.

## Region & language

The market is **Belarus**, the site language is **Russian**, and the currency is **BYN**.

- **All user-facing text is in Russian**: labels, buttons, placeholders, empty and error states, `alt` text, `aria-label`s. Code, identifiers and comments stay in English. There is no i18n framework (single language), so write Russian strings directly in templates.
- **Locale** `ru-BY` is set globally (`LOCALE_ID`, `DEFAULT_CURRENCY_CODE = 'BYN'`, date pipe timezone `+0300`). See [core/locale.ts](src/app/core/locale.ts). Use pipes / `shared/format` helpers and never hand-format:
  - prices: the `price` pipe from `shared/format/price` → `45 р`, `от 30 р`, `Бесплатно` (the design writes «р», not «Br»). Never hand-format.
  - dates and times: `{{ d | date: 'd MMMM, HH:mm' }}` gives `2 октября, 14:30`. Times are 24-hour, and weeks start on Monday.
- Money in models: `Price` (`{ kind: 'exact' | 'from', amount }` or `{ kind: 'free' }`) in BYN, not minor units.
- **Non-breaking spaces**: use the `NBSP` constant from `shared/format/text.ts`; never type the character itself or its unicode escape sequence in files you write (the tools turn the escape into the literal character, which fails ESLint no-irregular-whitespace).
- Mock data should be realistic for Belarus: Russian names (Анна, Екатерина…), Minsk and other Belarusian cities and districts, phones in the `+375 (29) 123-45-67` format, and typical local prices (a manicure costs roughly 30–80 BYN).
- Pluralise with Russian rules (1 отзыв / 2 отзыва / 5 отзывов). Use `Intl.PluralRules('ru')` or a small shared pipe, never `count + ' отзывов'`.

## Stack

- **Angular 21** (standalone, zoneless, signals). Node 24.14, so Angular 22 needs Node ≥24.15 first.
- **NgRx SignalStore** (`@ngrx/signals`, `@ngrx/operators`) for state. There is no classic `@ngrx/store` unless the user asks for it.
- **SCSS + design tokens**, with **no UI library**. Don't add Material, PrimeNG, Tailwind etc. without asking.
- **Jest** (`jest-preset-angular`, zoneless, jsdom), not Karma or Vitest.
- ESLint (`angular-eslint`) + Prettier (100 cols, single quotes).

## Commands

```
npm start              # dev server on http://localhost:4200
npm run check          # typecheck (incl. templates) + lint + all tests. Run before saying "done"
npm test -- <path>     # single spec; add --watch to iterate
npm run typecheck      # ngc (templates) + tsc (specs)
npm run lint:fix
npm run build
npx ng g c features/<f>/ui/<name>   # schematic defaults: OnPush, SCSS, spec
```

## Architecture

```
src/app/
  core/data/        SHARED DOMAIN: models.ts, catalog.ts (service catalog), rules.ts (ТЗ business
                    rules: search, distance, prices, booking rules), api.ts (abstract API tokens),
                    fixtures/ (seed data, relative to "now"), mock/ (MockDb + Mock…Api)
  core/session/     SessionStore (mock auth, active role client|master, favorites, unread), authGuard
  core/layout/      top bar (lg+), bottom tab bar (<lg), 404
  core/support/     «Напишите нам» sheet (SupportService.open())
  shared/ui/        icon, avatar, rating, tabs, segmented, sheet (dialog/bottom sheet), toast, swipe,
                    media-query (breakpoint signals)
  shared/format/    price, plural, dates pipes + NBSP constant
  features/         search (map home) · master-profile (+booking) · chats · profile (role switch
                    shell) · client-account · master-cabinet · auth (mock login)
src/styles/         _tokens.scss, _base.scss, _controls.scss (.btn .chip .card .tag .input .field
                    .dot .empty-state .skeleton), _map.scss (Leaflet), _breakpoints.scss
design/             Figma Make screenshots (mobile only) — the visual reference
```

Data flows one way: **page component → feature store → abstract API token (core/data/api.ts) → Mock…Api → MockDb**.

- **Domain is shared**, not per feature: masters, bookings and chats are used by several features, so models, APIs and the mock backend live in `core/data`. Features own their stores (`state/`), presentational components (`ui/`) and pages (`pages/`).
- **API layer**: `abstract class XApi` is the DI token; `MockXApi` runs against the in-memory `MockDb` (so a booking made on a master's page appears in chats and both cabinets) and returns `mockResponse()` / `mockError()`. All wired via `MOCK_API_PROVIDERS` in `app.config.ts`. **Never import `MockDb`, `Mock…Api` or fixtures outside `core/data` and specs.** Reload resets the data.
- **Business rules** (ТЗ) are pure functions in `core/data/rules.ts` — reuse them, don't re-implement in components.
- **Stores**: `signalStore` with `withState` / `withComputed` / `withMethods`, async via `rxMethod` + `tapResponse`. Track `loading` + `error`. Stores inject only API tokens (and `SessionStore`).
- **Components**: _pages_ (smart) inject the store and pass data down. `ui/` components are presentational: `input()` / `output()` only, and never inject stores or APIs.
- **Routes**: every feature is lazy (`<f>.routes.ts` default export). Route params arrive as component `input()`s. `/chats` and `/profile` require login (`authGuard`).

Use the `/new-feature` skill for templates.

## Domain (ТЗ)

- **Roles**: one account, two roles (client / master), switched in /profile by button or swipe. Chats are separate per role. Admin is out of scope for the mock.
- **Catalog**: category → subcategory (`catalog.ts`). A master's service = subcategory + price + duration. Price kinds: exact, «от», free — never ranges or «по договорённости».
- **Slots**: master sees free / booked (site) / busy (external, «не с сайта») / pending; client sees free / busy / pending (`slotStatusFor`).
- **Working schedule** (`ScheduleTemplate`): work days, hours, `breaks`, `slotMinutes` (procedure length), `capacity` (clients at once → parallel slots per start; clients see one via `onePerStart`). Slot times come from `templateTimes`, validation from `templateError`.
- **Expected revenue**: Σ per service of upcoming bookings × the service's current price (`expectedRevenue` in rules.ts; «от» = its amount, free = 0).
- **Booking flow**: book a free slot → pending + chat created with a booking card → the _opposite_ side confirms in the chat. Unconfirmed → slot released 24 h / 2 h before (`pendingReleaseAt`). Cancel needs a reason. «Перенести» = cancel + new booking (MVP). Overlapping bookings of one client auto-cancel the older one; same-day bookings < 60 min apart show a warning.
- **Map**: Leaflet + OSM/CARTO tiles, own pixel-grid clustering, pins show price («от 30 р»). Default sort: nearest.

## Features (what exists)

| Route                                                                                                                      | Folder                                                             | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                                                        | `features/search`                                                  | Map home: Leaflet map (OSM tiles, own clustering in `ui/search-map/cluster.ts`), search (`matchMaster`), all ТЗ 5.2 filters, 5.3 sorting, bottom sheet / side panel list. Store is root-provided so filters survive navigation; `q`/`service` mirrored in the URL.                                                                                                                                                                                                                                                                                             |
| `/masters/:id` (`?book=1&service=`)                                                                                        | `features/master-profile`                                          | Full public profile (services, portfolio lightbox, about, courses, contacts, reviews, nearest slots) + booking sheet (service → day → slot → conflict warnings → create → chat).                                                                                                                                                                                                                                                                                                                                                                               |
| `/chats`, `/chats/:chatId`                                                                                                 | `features/chats`                                                   | List per active role (+ «Как клиент / Как мастер» switch), thread with booking cards (confirm by the opposite side, cancel with reason), photos, edit/delete, block/delete chat. Two panes from md.                                                                                                                                                                                                                                                                                                                                                            |
| `/profile` → `/profile/client/bookings\|favorites\|reviews\|settings` (bookings `?sub=past`)                               | `features/profile` (role switch shell) + `features/client-account` | Layout shell (header + section nav, `<router-outlet>`, shared store) with one lazy child page per section: records (upcoming/past, confirm, cancel, «Перенести» = cancel + rebook), favorites, reviews (mine / about me), settings (notifications: push, email, site, reminders), «Стать мастером». `/profile/client` and old `?tab=x` links redirect to the section.                                                                                                                                                                                          |
| `/profile/master` → `/profile/master/<page>` (schedule, clients, stats, services, settings, card, portfolio, verification) | `features/master-cabinet`                                          | Shell (`CabinetShell`, owns `CabinetStore`, side menu from lg) + hub (today hero, tiles with live metrics) + one lazy page per section. Schedule: phone = day agenda (free time collapsed into «Свободно 10:00–13:00» chip ranges) / week cards; md+ = Google-Calendar-like time grid (`schedule-grid`); month calendar. «Рабочий график» page: work days, hours, breaks, procedure length, clients at once → regenerates 14 days of slots. Stats: revenue donut + forecast per service. Also clients, services & prices, card, portfolio (≤ 9), verification. |
| `/login`                                                                                                                   | `features/auth`                                                    | Mock sign-in into the demo account (Анна Новикова — client and master).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Visual check

`npm run build -- --configuration development` then `node scripts/screenshots.mjs [--only=map,chat] [--viewport=phone|tablet|desktop]` — drives the installed Edge headlessly (no extra deps), signs in via localStorage and writes `screenshots/<viewport>-<name>.png`. Compare phone shots with `design/*.png` after UI changes. (Pass shot names to `--only`, not `/paths` — Git Bash mangles leading slashes.)

## Angular conventions (lint-enforced where possible)

- `ChangeDetectionStrategy.OnPush` everywhere; standalone (no NgModules); `inject()`, not constructor DI.
- Signal APIs: `input()`, `input.required()`, `output()`, `model()`, `viewChild()`, `computed()`, `linkedSignal()`. No `@Input`/`@Output` decorators.
- Built-in control flow `@if` / `@for (…; track item.id)` / `@switch` / `@defer`. No `*ngIf` / `*ngFor`.
- No long-lived manual `subscribe` in components: use `rxMethod`, `toSignal`, or `takeUntilDestroyed`. One-shot commands from a store method are preferred over subscribing in a component.
- Use `effect()` only for side effects that leave the signal graph (DOM, storage), never to derive state.
- `type` imports (`import { type Foo }`), no `any`, strict templates. Use the `@app/*` path alias for cross-folder imports.
- Files: `kebab-case.ts`. Classes are named without a `Component` suffix (Angular 20+ style, e.g. `MasterCard` in `master-card.ts`).

## Styling

- **Only design tokens**: `var(--color-…)`, `var(--space-…)`, `var(--radius-…)`, and so on. There should be no raw hex or px values in components (1px hairlines are fine). Tokens live in [_tokens.scss](src/styles/_tokens.scss) (sampled from the design); global control classes in `_controls.scss` — reuse them before writing new button/chip/card styles.
- Mobile-first: `@use 'styles/breakpoints' as bp;` then `@include bp.up(md) { … }`.
- Styles are component-scoped; no `::ng-deep`. The component style budget is 4kB warning / 8kB error.
- Accessibility: semantic elements, labelled controls, `alt` text, visible focus, AA contrast.
- Every data view has loading, empty and error states.

## Testing

- Specs sit next to their source (`x.ts` → `x.spec.ts`). Test behaviour, not internals.
- Stores are tested with a fake API via `{ provide: XApi, useValue: fake }`. Components use `fixture.componentRef.setInput()`.
- Mock latency: pass `0` or use `jest.useFakeTimers()`.

## Figma

The design is a **Figma Make** file (mobile only). The connected Figma account has a View seat on a Starter plan: the MCP can't read the Make file (needs edit access) and is capped at ~20 calls/month, so the working reference is the screenshots in `design/`. For new screens ask the user for screenshots (or a Make code export), use the `/figma-to-code` skill, and don't invent layouts for designed screens. Tablet/desktop layouts are ours — keep them consistent with the existing ones. Tokens in `_tokens.scss` were sampled from the screenshots.

## Agents & automation

- **Agents** (`.claude/agents/`): `feature-planner` (plan before building a feature), `ui-designer` (Figma → SCSS UI), `test-writer` (Jest specs), `angular-reviewer` (review before calling a feature done).
- **Hooks** (`.claude/hooks/`, Node scripts):
  - Prettier formats every edited file.
  - Editing `package-lock.json`, `angular.json` or `.env*` asks the user first.
  - The **Stop hook** runs typecheck, ESLint and related Jest tests on changed `src/` files, and blocks finishing until they pass (at most 3 attempts).
- **MCP**: `angular-cli` (`ng mcp`) covers Angular docs, best practices and examples. Check it when unsure about a current Angular API.

## Working agreements

- It's a quick solo mock: prefer simple, working solutions over abstraction. Don't build for a backend that doesn't exist yet beyond the API-token seam.
- Ask before adding dependencies. Never commit or push unless asked.
- Keep this file current: when a feature lands, add its domain terms and folder here in one or two lines.
