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
3. Use **Commandes** to view, assign, confirm, deliver, or cancel orders.
4. Use **Produits** to add/edit products, update product-level stock, mark products inactive, and upload product images.
5. In **Produits > Teintes**, choose a product, then add/edit shades with SKU/reference, HEX color, optional shade price, stock, image URL/upload, and active/inactive status.

## Catalog Dry Run

Preview products from `https://flormar.tn` without writing to Supabase:

```bash
npm run catalog:dry-run
```

The script writes JSON/CSV previews to `catalog-preview/` and prints a report with product totals, variant totals, missing images/prices/SKUs, duplicates, and failed pages. It is intentionally dry-run only.

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
