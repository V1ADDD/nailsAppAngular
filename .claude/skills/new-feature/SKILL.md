---
name: new-feature
description: Scaffold a new feature slice (models, fixtures, abstract API + mock implementation, SignalStore, page component, lazy route, specs) following project conventions. Use when adding a feature area such as masters, services, bookings or reviews.
argument-hint: <feature-name> [short description]
---

# New feature slice

Feature: $ARGUMENTS

Create `src/app/features/<name>/` with this layout (names in kebab-case; classes in PascalCase):

```
features/<name>/
  data/
    <name>.model.ts            # interfaces
    <name>.fixtures.ts         # realistic mock data
    <name>.api.ts              # abstract class <Name>Api (DI token)
    mock-<name>.api.ts         # Mock<Name>Api extends <Name>Api, uses mockResponse()
    mock-<name>.api.spec.ts
  state/
    <name>.store.ts            # signalStore
    <name>.store.spec.ts
  ui/                          # presentational components (inputs/outputs only)
  pages/
    <name>-page/               # smart component: injects store, composes ui
  <name>.routes.ts             # export default Routes, lazy-loaded from app.routes.ts
```

## Templates

**API contract + mock**

```ts
// <name>.api.ts
export abstract class MastersApi {
  abstract getAll(): Observable<Master[]>;
  abstract getById(id: string): Observable<Master>;
}

// mock-<name>.api.ts
@Injectable()
export class MockMastersApi extends MastersApi {
  getAll() {
    return mockResponse(MASTERS);
  }
  getById(id: string) {
    const m = MASTERS.find((x) => x.id === id);
    return m ? mockResponse(m) : mockError(`Master ${id} not found`);
  }
}
// app.config.ts providers: { provide: MastersApi, useClass: MockMastersApi }
```

**Store**

```ts
type MastersState = { masters: Master[]; loading: boolean; error: string | null };

export const MastersStore = signalStore(
  { providedIn: 'root' },
  withState<MastersState>({ masters: [], loading: false, error: null }),
  withComputed(({ masters }) => ({ count: computed(() => masters().length) })),
  withMethods((store, api = inject(MastersApi)) => ({
    load: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          api.getAll().pipe(
            tapResponse({
              next: (masters) => patchState(store, { masters, loading: false }),
              error: (e: Error) => patchState(store, { error: e.message, loading: false }),
            }),
          ),
        ),
      ),
    ),
  })),
);
```

For collections that need lookups, updates or selection, prefer `withEntities<Master>()` from `@ngrx/signals/entities`.

## Steps

1. Generate components with `npx ng g c features/<name>/pages/<name>-page` (OnPush and SCSS are the schematic defaults).
2. Fill in the files using the templates above.
3. Register the lazy route in `app.routes.ts`: `{ path: '<name>', loadChildren: () => import('./features/<name>/<name>.routes') }`.
4. Register the API provider in `app.config.ts`.
5. Write specs for the mock API and the store (or delegate to **test-writer**).
6. Run `npm run check`.
