# TASKS.md

Operational checklist for the Flormar Tunisia ecommerce project.

## Current Priorities

- Keep `/admin` stable for product, variant, category, order, image, and settings management.
- Keep checkout stable: customer info, selected shade/SKU, final price, order save, and WhatsApp handoff.
- Keep product catalog data editable from `/admin`.
- Keep mobile shopping flows fast and easy.

## Before Editing

- Read `AGENTS.md`.
- Check `git status --short`.
- Identify the smallest files needed for the task.
- Avoid touching Supabase schema or Vercel settings unless the task explicitly requires it.

## Before Commit Or Deploy

- Run `npm run build`.
- Run `npm run lint` if available.
- Run `npm run typecheck` if available.
- Browser-test any changed storefront or admin flow.
- Confirm no secrets or generated artifacts are staged.

## Common Manual QA

- Homepage loads on desktop and mobile.
- Category pages show products and images.
- Product detail opens correctly.
- Shades can be selected and out-of-stock/disabled states behave as intended.
- Add to basket still works.
- Checkout saves an order.
- WhatsApp handoff opens with order details.
- `/admin` login works.
- Admin products/categories/orders/images still load and update.

## Deployment

- Push stable commits to `origin main`.
- Trigger or verify Vercel production deployment.
- Confirm `https://flormar-codex.vercel.app` after deploy.
- Re-test the changed flow in production.
