# Nails App (mock)

A web app where **nail masters sell their services**. For now it is **frontend only**: all data comes from typed mock services, and there is no backend. The UI is implemented from the user's **Figma design**. Features and the domain model get added here as screens are built.

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
  core/            app-wide singletons: api/ (mock helpers), layout/ (shell, header, nav)
  shared/ui/       reusable presentational primitives (button, card, avatar, rating, ...)
  features/<f>/    one folder per feature: data/ state/ ui/ pages/ <f>.routes.ts
src/styles/        _tokens.scss (design tokens), _base.scss, _breakpoints.scss
```

Data flows one way: **page component → feature store → abstract API token → Mock…Api → fixtures**.

- **API layer**: `abstract class XApi` is the DI token, and `MockXApi extends XApi` returns `mockResponse(data)` or `mockError(msg)` from [core/api/mock-response.ts](src/app/core/api/mock-response.ts) (with simulated latency). It is wired in `app.config.ts` as `{ provide: XApi, useClass: MockXApi }`. A real HTTP implementation will later replace the mock without touching stores or components. **Never import `Mock…Api` or fixtures outside `data/` and specs.**
- **Stores**: `signalStore` with `withState` / `withComputed` / `withMethods`, async via `rxMethod` + `tapResponse`. Track `loading` + `error` in state. Use `withEntities` for collections. Stores inject only API tokens.
- **Components**: _pages_ (smart) inject the store and pass data down. `ui/` components are presentational: `input()` / `output()` only, and never inject stores or APIs.
- **Routes**: every feature is lazy (`loadChildren` → `<f>.routes.ts` default export). Route params arrive as component `input()`s (`withComponentInputBinding` is enabled).

Use the `/new-feature` skill for templates.

## Angular conventions (lint-enforced where possible)

- `ChangeDetectionStrategy.OnPush` everywhere; standalone (no NgModules); `inject()`, not constructor DI.
- Signal APIs: `input()`, `input.required()`, `output()`, `model()`, `viewChild()`, `computed()`, `linkedSignal()`. No `@Input`/`@Output` decorators.
- Built-in control flow `@if` / `@for (…; track item.id)` / `@switch` / `@defer`. No `*ngIf` / `*ngFor`.
- No manual `subscribe` in components. Use `rxMethod`, `toSignal`, or `takeUntilDestroyed`.
- Use `effect()` only for side effects that leave the signal graph (DOM, storage), never to derive state.
- `type` imports (`import { type Foo }`), no `any`, strict templates. Use the `@app/*` path alias for cross-folder imports.
- Files: `kebab-case.ts`. Classes are named without a `Component` suffix (Angular 20+ style, e.g. `MasterCard` in `master-card.ts`).

## Styling

- **Only design tokens**: `var(--color-…)`, `var(--space-…)`, `var(--radius-…)`, and so on. There should be no raw hex or px values in components (1px hairlines are fine). Tokens in [_tokens.scss](src/styles/_tokens.scss) are **placeholders until synced from Figma**.
- Mobile-first: `@use 'styles/breakpoints' as bp;` then `@include bp.up(md) { … }`.
- Styles are component-scoped; no `::ng-deep`. The component style budget is 4kB warning / 8kB error.
- Accessibility: semantic elements, labelled controls, `alt` text, visible focus, AA contrast.
- Every data view has loading, empty and error states.

## Testing

- Specs sit next to their source (`x.ts` → `x.spec.ts`). Test behaviour, not internals.
- Stores are tested with a fake API via `{ provide: XApi, useValue: fake }`. Components use `fixture.componentRef.setInput()`.
- Mock latency: pass `0` or use `jest.useFakeTimers()`.

## Figma

The design comes from Figma. Use the `/figma-to-code <url>` skill. If Figma MCP tools aren't available, ask the user to connect the Figma connector or send screenshots. Don't invent layouts. Sync Figma variables into `_tokens.scss` before building screens.

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
