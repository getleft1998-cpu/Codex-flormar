# Flormar Tunisie

Next.js ecommerce site for COD cosmetics orders in Tunisia.

## Backend

The connected Supabase project is already configured:

- Project ref: `dqcfvmpmlsldzjrdwfgx`
- Tables: `categories`, `products`, `product_variants`, `orders`, `order_items`, `admin_users`, `admin_settings`
- Storage bucket: `product-images`
- RLS: public users can read active catalog data only; order creation runs through `create_order(...)`; admin mutations run through protected RPCs.

## Environment Variables

Set these locally in `.env.local` and in Vercel:

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `ADMIN_PASSWORD` | Password for the admin login screen |
| `ADMIN_SESSION_SECRET` | Long random secret for signed admin sessions |
| `ADMIN_DB_SECRET` | Server secret used by protected Supabase admin RPCs |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for product image uploads |
| `NEXT_PUBLIC_WHATSAPP` | Optional WhatsApp number for order handoff links |

## Local Development

```bash
npm install
npm run dev -- -p 3001
```

Open:

- Shop: `http://localhost:3001`
- Admin: `http://localhost:3001/admin`

## Admin Workflow

1. Open `/admin`.
2. Enter `ADMIN_PASSWORD`.
3. Use **Dashboard** for totals, revenue, low-stock products, recent orders, and quick actions.
4. Use **Orders** to search orders, view customer/address/items/shades/SKUs, contact by WhatsApp, assign orders, and change status.
5. Use **Products** to add/edit products, prices, sale prices, images, category, featured/active flags, and stock.
6. Use **Variants** to manage shades with SKU/reference, HEX color, optional shade price, image, active flag, and shade-level stock.
7. Use **Categories** to add/edit/hide/delete safe categories. Storefront category names update automatically.
8. Use **Homepage** and **Settings** to edit hero text/image, announcement text, WhatsApp, delivery/payment/footer copy, currency, and social links.

Image upload uses the server-only `SUPABASE_SERVICE_ROLE_KEY`. Keep it in `.env.local` and Vercel only; never expose it as `NEXT_PUBLIC_*`.

## Catalog Dry Run

Preview products from `https://flormar.tn` without writing to Supabase:

```bash
npm run catalog:dry-run
```

The script writes JSON/CSV previews to `catalog-preview/` and prints a report with product totals, variant totals, image match quality, missing images/prices/SKUs, duplicates, and failed pages. It uses Playwright to read public `flormar.tn` product pages, then checks `flormar.com` only for higher-quality image candidates. It is intentionally dry-run only: no Supabase writes and no image uploads happen until you approve an import.

After reviewing the preview and approving an import, run:

```bash
npm run catalog:import:approved
```

This imports the public sitemap products into Supabase through the protected admin RPCs. The source exposes stock status but not exact quantities, so every imported product/shade is kept active and receives a default editable stock quantity of `20`.

## Deployment

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add all environment variables listed above.
4. Deploy.

The build command is `npm run build`.
