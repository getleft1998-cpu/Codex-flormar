# Flormar Tunisie — Project Guide for Claude Code

## What this project is
E-commerce store for Tunisian women selling makeup with cash on delivery (COD).
Live URL: https://flormar-codex.vercel.app
Stack: Next.js, React, Supabase, Tailwind CSS, Pages Router
Deployed on: Vercel (auto-deploys from main branch on GitHub)

## Project structure
flormar-tn/
├── pages/
│   ├── index.js          ← ENTIRE storefront (1986 lines — home, product, category, checkout, admin login)
│   ├── api/
│   │   ├── orders.js     ← COD order submission
│   │   ├── products.js   ← product + category fetch
│   │   └── admin-login.js← admin auth
├── components/
│   └── ProfessionalAdminDashboard.js ← full admin panel
├── lib/
│   └── data.js           ← ALL translations (FR/AR), constants, price formatter, governorates
├── public/               ← static assets
└── .env.local            ← secrets (never commit)

## Key facts
- Two languages: French (default) and Arabic (RTL)
- Currency: DT (Dinar Tunisien) — format: 15,500 DT
- Phone format: 8 Tunisian digits or +216XXXXXXXX
- All translations live in lib/data.js — never hardcode strings in index.js
- Governorates: { fr, ar } objects — show fr when lang==='fr', ar when lang==='ar'
- Admin panel is password protected — credentials in Vercel env vars
- Supabase tables: products, categories, product_variants, orders

## Current known issues (do not re-audit these)
- M1: Admin JWT in localStorage (pending fix)
- M2: Raw img tags, no next/image optimization (pending fix)
- M3: HTML lang/dir not dynamic (pending fix)
- M5: No unique meta per product page (pending fix)
- M6: select('*') over-fetching (pending fix)
- N4: /admin redirects to /#admin (pending fix)
- N6: index.js is one large file (long-term refactor)

## What has been fixed already
- TND → DT currency
- Price format: dot → comma
- French accents throughout
- Floating WhatsApp FAB
- Arabic governorate names
- Auto-select first shade on product page
- Ajouté / تمت الإضافة translation
- Acheter maintenant → translation key
- Soins category name

## Admin dashboard known problem
- Product editing has bugs (currently being audited)
- File: components/ProfessionalAdminDashboard.js

## Rules for Claude Code
- Always build after changes to confirm no errors
- Never hardcode French/Arabic strings — use lib/data.js keys
- Never commit .env.local
- After all fixes in a session, run: git add . && git commit -m "..." && git push
- Keep commits descriptive in English
