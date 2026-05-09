# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`oenoboost-cms` is the **admin/editorial CMS** for OenoBoost, a French wine education platform. It is a standalone Next.js 14 app whose only consumer is editorial staff. It does **not** serve end users.

The public-facing app lives in a sibling repo at `../oenoboost-app/` (Next.js 15, React 19, Tailwind v4, Supabase Auth + RLS). Both apps point at the **same Supabase project**. Editorial conventions in the public app are documented in `../oenoboost-app/.cursor/rules/` and apply by extension to the data this CMS produces:

- All content tables carry `status` (`'draft' | 'published' | 'archived'`); the public app filters `status = 'published'` only.
- All content tables carry `deleted_at` and use **soft-delete**; queries must filter `deleted_at IS NULL`.
- Most editorial fields are bilingual via `_fr` / `_en` column suffixes.

The CMS does NOT inherit the public app's wine-editorial design system (`#7C2736` primary, Dream Avenue serif, `#FFFDEC` background). The CMS deliberately uses a neutral slate-toned admin UI — keep it that way unless asked.

## Commands

```bash
npm run dev          # next dev (default port 3000)
npm run build        # next build
npm run lint         # next lint (eslint-config-next)
npm test             # node --test --experimental-strip-types "**/*.test.ts"
```

Tests are colocated as `*.test.ts` next to the unit they cover (e.g. `app/admin/(cms)/appellations/link-sync.test.ts`). Run a single test:

```bash
node --test --experimental-strip-types app/admin/(cms)/appellations/link-sync.test.ts
```

There is no Vitest/Jest runner; the project uses Node's built-in test runner and TypeScript stripping. Tests must avoid framework-specific imports (use `node:test` and `node:assert/strict`).

### Admin bootstrap

There is no signup. To create the first admin login, use the Supabase service-role script:

```bash
ADMIN_EMAIL=foo@example.com ADMIN_PASSWORD=secret node scripts/set-admin-password.js
```

It bcrypt-hashes the password into `users.password_hash` and sets `users.role = 'admin'`.

### Data import scripts

The repo contains many one-off Python and TypeScript scripts under `/scripts` and the repo root for ingesting INSEE/comagri terroir data into Supabase (geojson → DB, communes ↔ AOP links, etc.). They are run ad-hoc with `npx tsx scripts/<name>.ts` or `python <name>.py` and rely on `.env`. None of them are part of the runtime.

## Environment

`.env` (gitignored) provides:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **the entire CMS server runs on this**; never leak to the browser
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- Optional `ADMIN_SESSION_SECRET` (falls back to `SUPABASE_SERVICE_ROLE_KEY` if unset — fine for dev, set explicitly in prod)

## Authentication

The CMS does **not** use Supabase Auth. It uses a hand-rolled HMAC-signed cookie session (`lib/auth.ts`):

- Cookie name `ob_admin`, value `<userId>.<base64url(HMAC-SHA256(userId, SECRET))>`.
- Login (`app/admin/page.tsx`) bcrypt-compares against `users.password_hash` and requires `users.role === 'admin'`.
- The `(cms)` layout (`app/admin/(cms)/layout.tsx`) re-validates the cookie server-side on every request and redirects to `/admin` on failure.
- A test bypass exists: `createTestAdminSession()` issues a `test.<sig>` cookie that resolves to a synthetic in-memory user (no DB row) — used by `/app/test/*` and dev tooling.

The session secret rotation invalidates all cookies. There is no refresh/expiry logic beyond a 7-day `maxAge`.

## Data access pattern

Server-side Supabase access goes through `lib/supabase.ts → getSupabaseAdmin()`, which returns a **service-role** client. This bypasses RLS, so authentication enforcement happens entirely at the Next layout boundary (`app/admin/(cms)/layout.tsx`). Do not introduce browser-side Supabase calls; if you must, use the anon key and RLS-safe queries.

Each feature under `app/admin/(cms)/<feature>/` follows a consistent shape:

- `page.tsx` — Server Component. Reads URL search params, calls server actions to fetch the list, passes serialized data to the view component.
- `actions.ts` — `"use server"` module. Exports the entity type, list/detail readers, and `create*` / `update*` / `delete*` mutations. Mutations end with `revalidatePath('/admin/<feature>')`. Reads throw on error; mutations return `{ error?: string }`.
- Components are split as `<Feature>View.tsx` (client coordinator), `<Feature>List.tsx` (left rail with search/filter/pagination), `<Feature>Editor.tsx` (right drawer/detail panel) under `components/admin/<feature>/`.

`deleteX` uses soft-delete (`update({ deleted_at: now })`) where the table supports it.

## Layout & navigation

- `/` → redirects to `/admin`.
- `/admin` → login screen if no valid cookie, else redirect to `/admin/dashboard`.
- `/admin/(cms)/*` — the actual CMS, behind a `<Sidebar>` + `<TopBar>` shell rendered by `(cms)/layout.tsx`.
- `/api/admin/appellations` — service-role JSON endpoint for the AOP list (consumed by `/test/aop-map`).
- `/api/test/*` and `/test/*` — preview/QA endpoints and pages used to verify content rendering before pushing to the public app. They are reachable in the CMS deployment but not linked from the sidebar.
- `/vignoble/[region]/...` — internal preview that mirrors the public-app vignoble UX so editors can sanity-check geometry. **It still reads the legacy `appellations` table** (see migration note below).

The CMS sidebar (`components/admin/Sidebar.tsx`) is the canonical list of editorial domains: wine regions, subregions, AOP, grapes, soil types, vinification, dictionary, news, quiz questions, quiz groups, users, subscriptions.

## Active migration: `appellations` (uuid) → `aop` (int4)

This is the most important non-obvious thing in the codebase. The repo is mid-migration from the legacy `public.appellations` table (uuid PK, ~311 hand-curated rows) to a new `public.aop` table (int4 PK aligned to comagri `IDA`, ~380 rows, complete coverage). The CMS code targets the **new** model. Context lives in `../oenoboost-app/docs/aop-migration-handoff.md`.

What you need to know when touching AOP code:

- The CMS **reads and writes `aop`**, not `appellations`. Junction tables are `aop_subregion_link` and `aop_soil_link`. See `app/admin/(cms)/appellations/actions.ts`.
- IDs are exposed as **strings** on every boundary (URL, props, state) and converted to numbers via `toNumberId()` only when calling Supabase. This keeps router/drawer code unchanged from the pre-migration state.
- `aop` has a single `name` column (no `name_fr` / `name_en`). The two values are always identical for AOPs, so the schema collapsed them. Every other content table still uses bilingual columns.
- `aop` has no geometry columns. The map gets polygons from `ST_Union(communes_full.geometry)` via the RPC `get_aop_communes_geojson`. Detail pages don't render geometry directly.
- Subregions also migrated to a new int4 `public.subregions` table for AOP linking. The legacy uuid `public.wine_subregions` table also exists and is what the **`wine-subregions` admin page edits**. Do not conflate them — `aop_subregion_link.subregion_id` references the new int4 table.
- `wine_regions` is uuid and was not migrated; IDs match across both subregion tables.
- `app/admin/(cms)/appellations/link-sync.ts` implements the diff/sync logic for `aop_subregion_link` (preserve existing links when payload omits subregion; reject publishing without a subregion). Tested in `link-sync.test.ts`.
- Legacy paths still touching `appellations` (uuid): `lib/vignoble-data.ts` and `/vignoble/[region]/*` preview pages. They use the manual fallback mapper in `lib/appellation-subregion-mapping.ts` (hard-coded slug → subregion lookup for Bordeaux/Rhône). Treat these as legacy until explicitly migrated.

When in doubt: new code → `aop`. Old code reading `appellations` → leave alone unless the task is explicitly migrating it.

## Storage

Supabase Storage buckets are created from SQL files in `docs/sql/`:

- `news-article-images` — public bucket for cropped 16:9 news cover images. Wired in `app/admin/(cms)/news/actions.ts` (`uploadNewsArticleCover`).
- `soil-photos` — see `create_soil_photos_bucket.sql`.

## HTML sanitization

`lib/sanitizeHtml.ts` is intentionally a **no-op pass-through**. Editorial HTML from TipTap is trusted because only authenticated admins author it. If content authoring ever opens to untrusted users, re-introduce DOMPurify here — don't pepper sanitize calls into individual editors.

## Conventions

- TypeScript: `strict: false`, path alias `@/*` → repo root, `noEmit: true`.
- The CMS is French-first: UI labels, button text, error messages, and code comments are in French. Public-facing content is bilingual but UI is FR-only.
- Server actions return `{ error?: string }`; pages render the error inline rather than throwing.
- Use `revalidatePath` after every mutation. Tag-based invalidation (`revalidateTag`) is the documented target in the public-app rules but is not yet wired in the CMS.
- Don't introduce client-side Supabase queries unless explicitly anon+RLS-safe.
