# AGENTS.md

Production guidance for Codex and other coding agents working on this Flormar Tunisia ecommerce project.

## Project

- Stack: Next.js, React, Supabase, Vercel, and existing styling conventions.
- Main storefront/admin file: `pages/index.js`.
- Admin CMS: `/admin` and `#admin` entry points must remain protected.
- Core data: categories, products, product variants/shades, orders, order items, settings, and Supabase Storage product images.
- Payment flow: Cash on Delivery only, with WhatsApp handoff preserved.

## Operating Rules

- Make the smallest safe edit that completes the task.
- Read the existing code before changing it; follow current architecture and naming.
- Do not rewrite working flows to make them prettier.
- Prefer local helpers and existing API routes over new abstractions.
- Keep frontend changes mobile-first and responsive.
- Avoid horizontal overflow on all mobile screens.
- Keep changes scoped. Do not mix unrelated cleanup with feature work.
- Optimize for low token usage: inspect targeted files, summarize large outputs, and avoid dumping long logs.

## Protected Areas

Do not break or casually refactor:

- `/admin` login/session behavior.
- Protected admin API routes.
- Checkout and order creation.
- Products, variants/shades, prices, stock, SKUs, and image handling.
- Supabase connection, RLS expectations, RPC/API contracts, and Storage bucket usage.
- WhatsApp checkout/order handoff.
- Vercel project link and environment variable setup.

## Coding Rules

- Preserve existing UI patterns and styling unless the task explicitly asks for redesign.
- Reuse existing button, form, table, and toast/loading patterns.
- Keep product/cart item structure compatible with checkout and admin orders.
- Do not change database schemas unless explicitly requested.
- Do not introduce new dependencies unless clearly needed and approved by the task.
- Do not commit secrets or generated local artifacts.
- Keep comments rare and useful.

## Mobile Rules

- Test product pages, category pages, cart, checkout, and `/admin` on mobile widths.
- Sticky/fixed UI must not cover important content; add bottom padding where needed.
- Use responsive constraints so text and controls fit inside their containers.
- Avoid layouts that depend on desktop hover behavior.
- Confirm `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`.

## Supabase Safety

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
- Keep service-role operations server-side only.
- Do not disable RLS to make a bug disappear.
- Anon users should only read public catalog/settings data and create orders through approved APIs.
- Admin mutations must go through protected admin APIs/RPCs.
- Do not delete products, categories, orders, variants, or images without explicit approval.
- Preserve orders during imports, migrations, and cleanup.
- Preserve manual stock/admin edits whenever possible.

## Vercel And Env

- Required production env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `ADMIN_DB_SECRET`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_WHATSAPP`
- Keep `.env.local`, `.env*.local`, `.vercel`, `.next`, `node_modules`, logs, and catalog previews out of commits.
- Verify the linked Vercel project before deployment if deployment behavior looks wrong.

## Testing Before Stable Commit Or Deploy

Run available checks before a stable commit or production deploy:

1. `npm run build`
2. `npm run lint` if the script exists
3. `npm run typecheck` if the script exists

For UI changes, also test the affected browser flow with Playwright or a real browser.
For checkout/admin changes, verify the API response and the visible UI.

## Deployment Workflow

1. Check `git status --short`.
2. Confirm only intended files changed.
3. Run required checks.
4. Commit with a clear, scoped message.
5. Push to `origin main` only when the task asks for deployment or stable publication.
6. Deploy with Vercel CLI or let GitHub integration deploy.
7. Verify production URL and the changed flow after deploy.

## Commit Rules

- Commit only intentional source/docs/config files.
- Do not include `.env.local`, `.env.import.local`, logs, `.next`, `node_modules`, or local preview output.
- Do not hide unrelated user changes inside a commit.
- Use concise messages such as `Add mobile buy now product action`.

## Forbidden Actions

- Do not run destructive git commands such as `git reset --hard` or `git checkout --` unless explicitly requested.
- Do not delete database rows, storage files, or orders without approval.
- Do not change Supabase schemas, RLS, or Vercel env vars unless requested.
- Do not move secrets into `NEXT_PUBLIC_*`.
- Do not replace the admin CMS, checkout backend, product importer, or catalog model unless the task explicitly asks.
- Do not hotlink production product images from scraped sites when importing catalog images.
