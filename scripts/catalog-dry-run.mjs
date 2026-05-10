import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCE_ORIGIN = 'https://flormar.tn'
const SITEMAP_URL = `${SOURCE_ORIGIN}/sitemap.xml`
const OUTPUT_DIR = 'catalog-preview'
const USER_AGENT = 'FlormarCodexDryRun/1.0 (+local catalog preview; no import)'

// IDs observed in flormar.tn productData. Unknown IDs still fall back to name heuristics.
const SOURCE_CATEGORY_HINTS = {
  '67b6fe917250df1e0e184359': 'face',
  '67b6fe917250df1e0e18435c': 'eyes',
  '67b6fe917250df1e0e184361': 'lips',
  '67b71e687250df1e0e1886a8': 'accessories',
  '67b8cbe4ab4c7904d0294d9f': 'skincare',
}

// The current flormar.tn sitemap only exposes a subset of products. These
// URLs were resolved from public rendered category pages, then each product
// is still imported from its public productData page.
const CATEGORY_VISIBLE_PRODUCT_URLS = [
  { category: 'face', name: 'stay perfect concealer', url: 'https://flormar.tn/product/stay-perfect-concealer-1' },
  { category: 'face', name: 'Blush-On', url: 'https://flormar.tn/product/blush-on' },
  { category: 'face', name: 'Wet&Dry Compact Powder', url: 'https://flormar.tn/product/wet-dry-compact-powder' },
  { category: 'face', name: 'Setn Go Fixing Powder Compact Powder', url: 'https://flormar.tn/product/setn-go-fixing-powder-compact-powder' },
  { category: 'face', name: 'Puffy Liquid Blush', url: 'https://flormar.tn/product/puffy-liquid-blush' },
  { category: 'face', name: 'Puffy Liquid Contour', url: 'https://flormar.tn/product/puffy-liquid-contour' },
  { category: 'face', name: 'Contour Stick', url: 'https://flormar.tn/product/contour-stick' },
  { category: 'face', name: 'Blossom Stick Blush', url: 'https://flormar.tn/product/blossom-stick-blush' },
  { category: 'face', name: 'Pack Flormar', url: 'https://flormar.tn/product/pack-flormar' },
  { category: 'face', name: 'Lip & Cheek Tint', url: 'https://flormar.tn/product/lip-cheek-tint' },
  { category: 'eyes', name: 'Volume Up Mascara', url: 'https://flormar.tn/product/volume-up-mascara' },
  { category: 'eyes', name: 'Vinyl Waterproof Dipliner Black', url: 'https://flormar.tn/product/vinyl-waterproof-dipliner-black' },
  { category: 'eyes', name: 'Tinted Brow Gel', url: 'https://flormar.tn/product/tinted-brow-gel' },
  { category: 'eyes', name: 'Open Up Hd Mascara', url: 'https://flormar.tn/product/open-up-hd-mascara' },
  { category: 'eyes', name: 'Open Up Waterproof Mascara', url: 'https://flormar.tn/product/open-up-waterproof-mascara' },
  { category: 'eyes', name: 'Hero Volume & Curl Mascara waterproof', url: 'https://flormar.tn/product/hero-volume-curl-mascara-waterproof' },
  { category: 'eyes', name: 'Eyeshadow Palette', url: 'https://flormar.tn/product/eyeshadow-palette' },
  { category: 'eyes', name: 'Eyeliner Pen Black', url: 'https://flormar.tn/product/eyeliner-pen-black' },
  { category: 'eyes', name: 'Eyebrow Pencil', url: 'https://flormar.tn/product/eyebrow-pencil' },
  { category: 'eyes', name: 'Color Eyeshadow Palette', url: 'https://flormar.tn/product/color-eyeshadow-palette' },
  { category: 'lips', name: 'Water Lip Stain', url: 'https://flormar.tn/product/water-lip-stain' },
  { category: 'lips', name: 'Hd Weightless Matte Lipstick – New', url: 'https://flormar.tn/product/hd-weightless-matte-lipstick-new' },
  { category: 'lips', name: 'Lift Up Caring Lip Plumper', url: 'https://flormar.tn/product/lift-up-caring-lip-plumper' },
  { category: 'lips', name: 'Sheer Up Lipstick', url: 'https://flormar.tn/product/sheer-up-lipstick' },
  { category: 'lips', name: 'Lip Balm Strawberry', url: 'https://flormar.tn/product/lip-balm-strawberry' },
  { category: 'lips', name: 'Lightweight Lip Powder', url: 'https://flormar.tn/product/lightweight-lip-powder' },
  { category: 'lips', name: 'Duoglam Lipstick', url: 'https://flormar.tn/product/duoglam-lipstick' },
  { category: 'lips', name: 'Creamy Stylo Lipstick', url: 'https://flormar.tn/product/creamy-stylo-lipstick' },
  { category: 'lips', name: 'Waterproof Lipliner', url: 'https://flormar.tn/product/waterproof-lipliner-1' },
  { category: 'lips', name: 'Dewy Lip Glaze', url: 'https://flormar.tn/product/dewy-lip-glaze-1' },
  { category: 'accessories', name: 'Shading Brush', url: 'https://flormar.tn/product/shading-brush' },
  { category: 'accessories', name: 'Powder Brush', url: 'https://flormar.tn/product/powder-brush' },
  { category: 'accessories', name: 'Flared Cut Blush Brush', url: 'https://flormar.tn/product/flared-cut-blush-brush' },
  { category: 'accessories', name: 'Eyeshadow Brush', url: 'https://flormar.tn/product/eyeshadow-brush' },
  { category: 'accessories', name: 'Contour Brush', url: 'https://flormar.tn/product/contour-brush' },
  { category: 'accessories', name: 'Concealer Brush', url: 'https://flormar.tn/product/concealer-brush' },
  { category: 'accessories', name: 'Blusher Brush', url: 'https://flormar.tn/product/blusher-brush' },
  { category: 'accessories', name: 'Blending Brush', url: 'https://flormar.tn/product/blending-brush' },
  { category: 'skincare', name: 'Vitamin Bomb Serum&Primer', url: 'https://flormar.tn/product/vitamin-bomb-serum-primer' },
  { category: 'skincare', name: 'pore minimizer', url: 'https://flormar.tn/product/pore-minimizer' },
  { category: 'skincare', name: 'Tinted Moisturizer Spf50', url: 'https://flormar.tn/product/tinted-moisturizer-spf50' },
  { category: 'skincare', name: 'Illuminating Makeup Primer Plus+', url: 'https://flormar.tn/product/illuminating-makeup-primer-plus' },
  { category: 'skincare', name: 'Illuminating Primer Make-Up Base', url: 'https://flormar.tn/product/illuminating-primer-make-up-base' },
]

const CATEGORY_RULES = [
  ['accessories', /\b(brush|pinceau|sponge|mirror|accessor|ksswrt|bag|trousse)\b/i],
  ['nails', /\b(nail|vernis|ongle|manicure|base coat|top coat)\b/i],
  ['eyes', /\b(mascara|eyeliner|eye|brow|shadow|lash|sourcil|paupiere)\b/i],
  ['lips', /\b(lip|lips|lipstick|gloss|plumper|stain|rouge|levre)\b/i],
  ['skincare', /\b(serum|primer|pore|moisturizer|spf|skin|cream|bomb|soin|hydr)\b/i],
  ['face', /\b(face|foundation|concealer|teint|blush|powder|bronzer|corrector)\b/i],
]

function argValue(name, fallback = '') {
  const prefix = `${name}=`
  const found = process.argv.find(arg => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

async function fetchText(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xml,text/xml,*/*' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

function extractJsonScript(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`<script id="${escaped}" type="application/json">([\\s\\S]*?)<\\/script>`))
  if (!match) return null
  return JSON.parse(match[1])
}

function stripHtml(value = '') {
  return decodeEntities(String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim())
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function bestImage(images = []) {
  const first = images?.[0]
  if (!first) return ''
  return first.lg || first.md || first.sm || ''
}

function imageFromVariant(variant) {
  return variant?.image || ''
}

function stockStatus(stock) {
  if (!stock) return 'unknown'
  return stock.outOfStock ? 'out_of_stock' : 'in_stock'
}

function mappedStockQuantity(status) {
  // Source exposes availability, not exact quantity. The preview uses 1 only as
  // an import placeholder so available items can be reviewed before import.
  if (status === 'out_of_stock') return 0
  if (status === 'in_stock') return 1
  return 0
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function inferCategory(product) {
  for (const id of product.categories || []) {
    if (SOURCE_CATEGORY_HINTS[id]) return SOURCE_CATEGORY_HINTS[id]
  }

  const haystack = `${product.name || ''} ${stripHtml(product.description || '')} ${product.slug || ''}`
  const found = CATEGORY_RULES.find(([, pattern]) => pattern.test(haystack))
  return found?.[0] || 'face'
}

function normalizeVariant(product, variant, index) {
  const selectedValues = variant.selectedValues?.length ? variant.selectedValues : product.options?.flatMap(option => option.values?.map(value => value.value) || []) || []
  const shadeName = selectedValues.join(' / ').trim() || `Variant ${index + 1}`
  const status = stockStatus(variant.stock || product.newStock)
  const price = numberOrNull(variant.price ?? product.price)
  const comparePrice = numberOrNull(variant.comparePrice ?? product.comparePrice)
  const sku = variant.sku || ''

  return {
    source_id: variant.id || '',
    source_reference: product.reference ? String(product.reference) : '',
    shade_name: shadeName,
    sku: sku || null,
    suggested_sku: sku || (product.reference ? `${product.reference}-${slugify(shadeName).toUpperCase()}` : ''),
    color_hex: null,
    image_url: imageFromVariant(variant),
    price,
    compare_price: comparePrice,
    discount_amount: comparePrice && price && comparePrice > price ? comparePrice - price : 0,
    stock_status: status,
    stock_quantity: mappedStockQuantity(status),
    is_active: product.status !== 'hidden' && !product.isDeleted,
    display_order: index,
  }
}

function normalizeProduct(product, sourceUrl) {
  const price = numberOrNull(product.price)
  const comparePrice = numberOrNull(product.comparePrice)
  const variants = (product.newVariants || []).map((variant, index) => normalizeVariant(product, variant, index))
  const status = stockStatus(product.newStock)
  const mappedCategory = inferCategory(product)

  return {
    source: {
      url: sourceUrl,
      id: product._id || '',
      slug: product.slug || '',
      reference: product.reference ? String(product.reference) : '',
      category_ids: product.categories || [],
      currency: 'TND',
      raw_stock_status: status,
    },
    category: {
      slug: mappedCategory,
    },
    product: {
      legacy_id: null,
      category: mappedCategory,
      slug: product.slug || slugify(product.name),
      sku: product.reference ? String(product.reference) : null,
      name_fr: product.name || '',
      name_ar: product.name || '',
      description_fr: stripHtml(product.description || ''),
      description_ar: stripHtml(product.description || ''),
      price,
      compare_price: comparePrice,
      discount_amount: comparePrice && price && comparePrice > price ? comparePrice - price : 0,
      image_url: bestImage(product.images),
      tag: comparePrice && price && comparePrice > price ? 'bestseller' : '',
      stock_status: status,
      stock_quantity: variants.length ? variants.reduce((sum, variant) => sum + variant.stock_quantity, 0) : mappedStockQuantity(status),
      is_active: product.status !== 'hidden' && !product.isDeleted,
      display_order: Math.abs(Number(product.order || product.reference || 0)),
    },
    product_images: (product.images || []).map((image, index) => ({
      source_url: image.lg || image.md || image.sm || '',
      storage_bucket: 'product-images',
      suggested_path: `${product.slug || slugify(product.name)}/${index + 1}.webp`,
      is_primary: index === 0,
    })).filter(image => image.source_url),
    variants,
  }
}

function toCsvValue(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function makeCsv(products) {
  const headers = [
    'source_url',
    'category',
    'product_slug',
    'product_name',
    'product_reference',
    'product_price',
    'product_compare_price',
    'product_image',
    'variant_shade',
    'variant_sku',
    'variant_suggested_sku',
    'variant_price',
    'variant_compare_price',
    'variant_stock_status',
    'variant_image',
  ]
  const rows = [headers]

  for (const item of products) {
    if (item.variants.length === 0) {
      rows.push([
        item.source.url,
        item.product.category,
        item.product.slug,
        item.product.name_fr,
        item.source.reference,
        item.product.price,
        item.product.compare_price,
        item.product.image_url,
        '',
        item.product.sku || '',
        item.product.sku || '',
        '',
        '',
        item.product.stock_status,
        '',
      ])
      continue
    }

    for (const variant of item.variants) {
      rows.push([
        item.source.url,
        item.product.category,
        item.product.slug,
        item.product.name_fr,
        item.source.reference,
        item.product.price,
        item.product.compare_price,
        item.product.image_url,
        variant.shade_name,
        variant.sku || '',
        variant.suggested_sku || '',
        variant.price,
        variant.compare_price,
        variant.stock_status,
        variant.image_url,
      ])
    }
  }

  return rows.map(row => row.map(toCsvValue).join(',')).join('\n')
}

function duplicateReport(products) {
  const bySlug = new Map()
  const byName = new Map()
  const bySku = new Map()

  for (const item of products) {
    const slug = item.product.slug
    const name = item.product.name_fr.toLowerCase()
    if (slug) bySlug.set(slug, [...(bySlug.get(slug) || []), item.source.url])
    if (name) byName.set(name, [...(byName.get(name) || []), item.source.url])

    for (const sku of [item.product.sku, ...item.variants.map(variant => variant.sku)].filter(Boolean)) {
      bySku.set(sku, [...(bySku.get(sku) || []), item.source.url])
    }
  }

  const onlyDupes = map => [...map.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([value, urls]) => ({ value, urls }))

  return {
    slugs: onlyDupes(bySlug),
    names: onlyDupes(byName),
    skus: onlyDupes(bySku),
  }
}

function makeReport(products, failedPages, discovered) {
  const variants = products.flatMap(product => product.variants)
  const missingImages = products.filter(product => !product.product.image_url).map(product => product.source.url)
  const missingPrices = products.filter(product => product.product.price === null).map(product => product.source.url)
  const missingProductSkus = products.filter(product => !product.product.sku).map(product => product.source.url)
  const missingVariantSkus = variants
    .filter(variant => !variant.sku)
    .map(variant => ({ product_reference: variant.source_reference, shade: variant.shade_name, suggested_sku: variant.suggested_sku }))
  const duplicates = duplicateReport(products)

  return {
    dry_run: true,
    source: SOURCE_ORIGIN,
    robots_note: 'robots.txt disallows /api/ on flormar.tn, so this dry run crawls sitemap/product pages only and does not call flormar.tn/api.',
    discovered,
    totals: {
      products_found: products.length,
      variants_found: variants.length,
      missing_images: missingImages.length,
      missing_prices: missingPrices.length,
      missing_product_skus: missingProductSkus.length,
      missing_variant_skus: missingVariantSkus.length,
      duplicate_slug_groups: duplicates.slugs.length,
      duplicate_name_groups: duplicates.names.length,
      duplicate_sku_groups: duplicates.skus.length,
      failed_pages: failedPages.length,
    },
    missing: {
      images: missingImages,
      prices: missingPrices,
      product_skus: missingProductSkus,
      variant_skus: missingVariantSkus,
    },
    duplicates,
    failed_pages: failedPages,
  }
}

async function main() {
  if (hasArg('--import')) {
    throw new Error('This script is dry-run only. It never writes to Supabase.')
  }

  const maxProducts = Number(argValue('--max-products', '0'))
  const sitemapXml = await fetchText(SITEMAP_URL)
  const sitemapProductUrls = [...sitemapXml.matchAll(/<loc>(https:\/\/flormar\.tn\/product\/[^<]+)<\/loc>/g)].map(match => match[1])
  const visibleCategoryProductUrls = CATEGORY_VISIBLE_PRODUCT_URLS.map(product => product.url)
  const productUrls = [...new Set([...sitemapProductUrls, ...visibleCategoryProductUrls])]
  const categoryUrls = [...sitemapXml.matchAll(/<loc>(https:\/\/flormar\.tn\/category\/[^<]+)<\/loc>/g)].map(match => match[1])
  const urls = maxProducts > 0 ? productUrls.slice(0, maxProducts) : productUrls

  const products = []
  const failedPages = []

  for (const url of urls) {
    try {
      const html = await fetchText(url)
      const productData = extractJsonScript(html, 'productData')
      if (!productData) throw new Error('Missing productData JSON')
      products.push(normalizeProduct(productData, url))
    } catch (error) {
      failedPages.push({ url, error: error.message })
    }
  }

  products.sort((a, b) => a.product.display_order - b.product.display_order || a.product.name_fr.localeCompare(b.product.name_fr))

  const report = makeReport(products, failedPages, {
    sitemap_url: SITEMAP_URL,
    product_urls_found_in_sitemap: sitemapProductUrls.length,
    product_urls_found_in_rendered_categories: visibleCategoryProductUrls.length,
    unique_product_urls_crawled: urls.length,
    category_urls_found_in_sitemap: categoryUrls.length,
    category_urls: categoryUrls,
    rendered_category_products: CATEGORY_VISIBLE_PRODUCT_URLS,
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await mkdir(OUTPUT_DIR, { recursive: true })
  const jsonPath = path.join(OUTPUT_DIR, `flormar-tn-catalog-dry-run-${timestamp}.json`)
  const csvPath = path.join(OUTPUT_DIR, `flormar-tn-catalog-dry-run-${timestamp}.csv`)
  const latestPath = path.join(OUTPUT_DIR, 'latest-summary.json')

  const output = {
    report,
    mapped_schema_preview: {
      categories: [...new Set(products.map(item => item.category.slug))].map(slug => ({ slug })),
      products: products.map(item => item.product),
      product_variants: products.flatMap(item => item.variants.map(variant => ({
        product_slug: item.product.slug,
        ...variant,
      }))),
      product_images: products.flatMap(item => item.product_images.map(image => ({
        product_slug: item.product.slug,
        ...image,
      }))),
    },
    products,
  }

  await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  await writeFile(csvPath, `${makeCsv(products)}\n`, 'utf8')
  await writeFile(latestPath, `${JSON.stringify({ ...report, files: { json: jsonPath, csv: csvPath } }, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({ ...report, files: { json: jsonPath, csv: csvPath } }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
