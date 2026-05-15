import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const TN_ORIGIN = 'https://flormar.tn'
const GLOBAL_ORIGIN = 'https://www.flormar.com'
const TN_SITEMAP_URL = `${TN_ORIGIN}/sitemap.xml`
const GLOBAL_SITEMAP_URLS = [
  `${GLOBAL_ORIGIN}/product-sitemap.xml`,
  `${GLOBAL_ORIGIN}/wp-sitemap-posts-product-1.xml`,
]
const OUTPUT_DIR = 'catalog-preview'
const STORAGE_BUCKET = 'product-images'
const DEFAULT_IMPORT_STOCK = Number(argValue('--default-stock', '20'))
const USER_AGENT = 'FlormarCodexHybridDryRun/1.0 (+local preview; no import)'

const CATEGORY_PAGE_MAP = {
  'category-1': {
    slug: 'face',
    name_fr: 'Visage',
    name_ar: 'منتجات الوجه',
    display_order: 1,
    url: `${TN_ORIGIN}/category/category-1`,
  },
  'category-2': {
    slug: 'eyes',
    name_fr: 'Yeux',
    name_ar: 'منتجات العيون',
    display_order: 2,
    url: `${TN_ORIGIN}/category/category-2`,
  },
  'category-3': {
    slug: 'lips',
    name_fr: 'Levres',
    name_ar: 'منتجات الشفاه',
    display_order: 3,
    url: `${TN_ORIGIN}/category/category-3`,
  },
  ksswrt: {
    slug: 'accessories',
    name_fr: 'Accessoires',
    name_ar: 'إكسسوارات',
    display_order: 6,
    url: `${TN_ORIGIN}/category/ksswrt`,
  },
  'laany-blbshr': {
    slug: 'skincare',
    name_fr: 'Soin',
    name_ar: 'العناية بالبشرة',
    display_order: 5,
    url: `${TN_ORIGIN}/category/laany-blbshr`,
  },
}

const DEFAULT_CATEGORY_MAP = {
  face: { slug: 'face', name_fr: 'Visage', name_ar: 'منتجات الوجه', display_order: 1 },
  eyes: { slug: 'eyes', name_fr: 'Yeux', name_ar: 'منتجات العيون', display_order: 2 },
  lips: { slug: 'lips', name_fr: 'Levres', name_ar: 'منتجات الشفاه', display_order: 3 },
  nails: { slug: 'nails', name_fr: 'Ongles', name_ar: 'الأظافر', display_order: 4 },
  skincare: { slug: 'skincare', name_fr: 'Soin', name_ar: 'العناية بالبشرة', display_order: 5 },
  accessories: { slug: 'accessories', name_fr: 'Accessoires', name_ar: 'إكسسوارات', display_order: 6 },
}

const SOURCE_CATEGORY_HINTS = {
  '67b6fe917250df1e0e184359': 'face',
  '67b6fe917250df1e0e18435c': 'eyes',
  '67b6fe917250df1e0e184361': 'lips',
  '67b71e687250df1e0e1886a8': 'accessories',
  '67b8cbe4ab4c7904d0294d9f': 'skincare',
}

const CATEGORY_RULES = [
  ['accessories', /\b(brush|pinceau|sponge|mirror|accessor|bag|trousse)\b/i],
  ['nails', /\b(nail|vernis|ongle|manicure|base coat|top coat)\b/i],
  ['eyes', /\b(mascara|eyeliner|eye|brow|shadow|lash|sourcil|paupiere|palette)\b/i],
  ['lips', /\b(lip|lips|lipstick|gloss|plumper|stain|liner|rouge|levre|duo)\b/i],
  ['skincare', /\b(serum|primer|pore|moisturizer|spf|skin|cream|bomb|soin|hydr)\b/i],
  ['face', /\b(face|foundation|concealer|teint|blush|powder|bronzer|contour|corrector)\b/i],
]

// flormar.tn does not expose product anchors in the rendered category DOM.
// These public category product URLs were resolved from the visible category
// cards, then every product is still scraped from its own productData page.
const CATEGORY_VISIBLE_PRODUCT_URLS = [
  { category: 'face', name: 'stay perfect concealer', url: `${TN_ORIGIN}/product/stay-perfect-concealer-1` },
  { category: 'face', name: 'Blush-On', url: `${TN_ORIGIN}/product/blush-on` },
  { category: 'face', name: 'Wet&Dry Compact Powder', url: `${TN_ORIGIN}/product/wet-dry-compact-powder` },
  { category: 'face', name: 'Setn Go Fixing Powder Compact Powder', url: `${TN_ORIGIN}/product/setn-go-fixing-powder-compact-powder` },
  { category: 'face', name: 'Puffy Liquid Blush', url: `${TN_ORIGIN}/product/puffy-liquid-blush` },
  { category: 'face', name: 'Puffy Liquid Contour', url: `${TN_ORIGIN}/product/puffy-liquid-contour` },
  { category: 'face', name: 'Contour Stick', url: `${TN_ORIGIN}/product/contour-stick` },
  { category: 'face', name: 'Blossom Stick Blush', url: `${TN_ORIGIN}/product/blossom-stick-blush` },
  { category: 'face', name: 'Pack Flormar', url: `${TN_ORIGIN}/product/pack-flormar` },
  { category: 'face', name: 'Lip & Cheek Tint', url: `${TN_ORIGIN}/product/lip-cheek-tint` },
  { category: 'eyes', name: 'Volume Up Mascara', url: `${TN_ORIGIN}/product/volume-up-mascara` },
  { category: 'eyes', name: 'Vinyl Waterproof Dipliner Black', url: `${TN_ORIGIN}/product/vinyl-waterproof-dipliner-black` },
  { category: 'eyes', name: 'Tinted Brow Gel', url: `${TN_ORIGIN}/product/tinted-brow-gel` },
  { category: 'eyes', name: 'Open Up Hd Mascara', url: `${TN_ORIGIN}/product/open-up-hd-mascara` },
  { category: 'eyes', name: 'Open Up Waterproof Mascara', url: `${TN_ORIGIN}/product/open-up-waterproof-mascara` },
  { category: 'eyes', name: 'Hero Volume & Curl Mascara waterproof', url: `${TN_ORIGIN}/product/hero-volume-curl-mascara-waterproof` },
  { category: 'eyes', name: 'Eyeshadow Palette', url: `${TN_ORIGIN}/product/eyeshadow-palette` },
  { category: 'eyes', name: 'Eyeliner Pen Black', url: `${TN_ORIGIN}/product/eyeliner-pen-black` },
  { category: 'eyes', name: 'Eyebrow Pencil', url: `${TN_ORIGIN}/product/eyebrow-pencil` },
  { category: 'eyes', name: 'Color Eyeshadow Palette', url: `${TN_ORIGIN}/product/color-eyeshadow-palette` },
  { category: 'lips', name: 'Water Lip Stain', url: `${TN_ORIGIN}/product/water-lip-stain` },
  { category: 'lips', name: 'Hd Weightless Matte Lipstick New', url: `${TN_ORIGIN}/product/hd-weightless-matte-lipstick-new` },
  { category: 'lips', name: 'Lift Up Caring Lip Plumper', url: `${TN_ORIGIN}/product/lift-up-caring-lip-plumper` },
  { category: 'lips', name: 'Sheer Up Lipstick', url: `${TN_ORIGIN}/product/sheer-up-lipstick` },
  { category: 'lips', name: 'Lip Balm Strawberry', url: `${TN_ORIGIN}/product/lip-balm-strawberry` },
  { category: 'lips', name: 'Lightweight Lip Powder', url: `${TN_ORIGIN}/product/lightweight-lip-powder` },
  { category: 'lips', name: 'Duoglam Lipstick', url: `${TN_ORIGIN}/product/duoglam-lipstick` },
  { category: 'lips', name: 'Creamy Stylo Lipstick', url: `${TN_ORIGIN}/product/creamy-stylo-lipstick` },
  { category: 'lips', name: 'Waterproof Lipliner', url: `${TN_ORIGIN}/product/waterproof-lipliner-1` },
  { category: 'lips', name: 'Dewy Lip Glaze', url: `${TN_ORIGIN}/product/dewy-lip-glaze-1` },
  { category: 'accessories', name: 'Shading Brush', url: `${TN_ORIGIN}/product/shading-brush` },
  { category: 'accessories', name: 'Powder Brush', url: `${TN_ORIGIN}/product/powder-brush` },
  { category: 'accessories', name: 'Flared Cut Blush Brush', url: `${TN_ORIGIN}/product/flared-cut-blush-brush` },
  { category: 'accessories', name: 'Eyeshadow Brush', url: `${TN_ORIGIN}/product/eyeshadow-brush` },
  { category: 'accessories', name: 'Contour Brush', url: `${TN_ORIGIN}/product/contour-brush` },
  { category: 'accessories', name: 'Concealer Brush', url: `${TN_ORIGIN}/product/concealer-brush` },
  { category: 'accessories', name: 'Blusher Brush', url: `${TN_ORIGIN}/product/blusher-brush` },
  { category: 'accessories', name: 'Blending Brush', url: `${TN_ORIGIN}/product/blending-brush` },
  { category: 'skincare', name: 'Vitamin Bomb Serum&Primer', url: `${TN_ORIGIN}/product/vitamin-bomb-serum-primer` },
  { category: 'skincare', name: 'pore minimizer', url: `${TN_ORIGIN}/product/pore-minimizer` },
  { category: 'skincare', name: 'Tinted Moisturizer Spf50', url: `${TN_ORIGIN}/product/tinted-moisturizer-spf50` },
  { category: 'skincare', name: 'Illuminating Makeup Primer Plus+', url: `${TN_ORIGIN}/product/illuminating-makeup-primer-plus` },
  { category: 'skincare', name: 'Pack Flormar', url: `${TN_ORIGIN}/product/pack-flormar` },
  { category: 'skincare', name: 'Illuminating Primer Make-Up Base', url: `${TN_ORIGIN}/product/illuminating-primer-make-up-base` },
]

function argValue(name, fallback = '') {
  const prefix = `${name}=`
  const found = process.argv.find(arg => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchText(url, timeoutMs = 20000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xml,text/xml,*/*',
        'user-agent': USER_AGENT,
      },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true })
  } catch {
    return chromium.launch({ headless: true })
  }
}

async function readPageData(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

  return page.evaluate(() => {
    function parseScript(id) {
      const element = document.querySelector(`#${id}`)
      if (!element?.textContent) return null
      return JSON.parse(element.textContent)
    }

    return {
      title: document.title,
      url: location.href,
      text: document.body?.innerText || '',
      storeData: parseScript('storeData'),
      productData: parseScript('productData'),
      links: [...document.querySelectorAll('a[href]')].map(anchor => ({
        text: anchor.textContent.trim().replace(/\s+/g, ' '),
        href: anchor.href,
      })),
      images: [...document.querySelectorAll('img')].map(image => ({
        alt: image.alt || '',
        src: image.currentSrc || image.src || '',
      })),
      metaImages: [...document.querySelectorAll('meta[property="og:image"], meta[name="og:image"]')]
        .map(meta => meta.content)
        .filter(Boolean),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map(script => script.textContent || '')
        .filter(Boolean),
    }
  })
}

function extractLocs(xml, pattern = /<loc>([^<]+)<\/loc>/g) {
  return [...xml.matchAll(pattern)].map(match => decodeEntities(match[1].trim()))
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
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

function normalizeKey(value) {
  return slugify(value)
    .replace(/\b(new|black|waterproof|hd)\b/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function exactNameKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(value) {
  return new Set(normalizeKey(value).split('-').filter(token => token.length > 1))
}

function tokenSimilarity(a, b) {
  const left = tokenSet(a)
  const right = tokenSet(b)
  if (!left.size || !right.size) return 0
  const intersection = [...left].filter(token => right.has(token)).length
  const union = new Set([...left, ...right]).size
  return intersection / union
}

function highQualityConvertyImage(url = '') {
  return String(url || '').replace(/_sm(\.(?:webp|jpg|jpeg|png))(?:\?.*)?$/i, '_lg$1')
}

function firstProductImage(images = []) {
  const first = images?.[0]
  if (!first) return ''
  return highQualityConvertyImage(first.lg || first.md || first.sm || '')
}

function variantImage(variant) {
  return highQualityConvertyImage(variant?.image || '')
}

function stockStatus(stock, productStatus = '') {
  if (productStatus === 'outOfStock') return 'out_of_stock'
  if (!stock) return 'unknown'
  return stock.outOfStock ? 'out_of_stock' : 'in_stock'
}

function safeImportStock() {
  return DEFAULT_IMPORT_STOCK
}

function inferCategory(product, categoryHint = '') {
  if (categoryHint) return categoryHint

  for (const id of product.categories || []) {
    if (SOURCE_CATEGORY_HINTS[id]) return SOURCE_CATEGORY_HINTS[id]
  }

  const haystack = `${product.name || ''} ${stripHtml(product.description || '')} ${product.slug || ''}`
  const found = CATEGORY_RULES.find(([, pattern]) => pattern.test(haystack))
  return found?.[0] || 'face'
}

function displayPrice(productOrVariant) {
  return {
    current: numberOrNull(productOrVariant.price),
    compare: numberOrNull(productOrVariant.comparePrice),
  }
}

function mapPriceFields(current, compare) {
  if (current !== null && compare !== null && compare > current) {
    return {
      price: compare,
      sale_price: current,
      final_price: current,
      discount_amount: compare - current,
      discount_percent: Math.round(((compare - current) / compare) * 100),
    }
  }

  return {
    price: current,
    sale_price: null,
    final_price: current,
    discount_amount: 0,
    discount_percent: 0,
  }
}

function normalizeVariant(product, variant, index, productFinalPrice) {
  const shadeName = (variant.selectedValues?.length
    ? variant.selectedValues
    : product.options?.flatMap(option => option.values?.map(value => value.value) || []) || [])
    .join(' / ')
    .trim() || `Shade ${index + 1}`
  const { current, compare } = displayPrice(variant)
  const status = stockStatus(variant.stock, product.status)
  const rawSku = String(variant.sku || variant.barcode || '').trim()
  const sourceRef = product.reference ? String(product.reference) : ''
  const suggestedSku = rawSku || (sourceRef ? `${sourceRef}-${slugify(shadeName).toUpperCase()}` : '')
  const variantFinalPrice = current ?? productFinalPrice

  return {
    source_id: variant.id || '',
    source_reference: sourceRef,
    shade_name: shadeName,
    sku: rawSku || null,
    suggested_sku: suggestedSku || null,
    color_hex: null,
    image_url_tn: variantImage(variant),
    image_url: variantImage(variant),
    source_price: current,
    source_compare_price: compare,
    price: variantFinalPrice !== null && Number(variantFinalPrice) !== Number(productFinalPrice) ? variantFinalPrice : null,
    source_stock_status: status,
    stock_quantity: safeImportStock(),
    stock_note: `Source stock status was ${status}; import preview keeps editable default stock ${DEFAULT_IMPORT_STOCK}.`,
    is_active: true,
    display_order: index,
  }
}

function normalizeProduct(product, sourceUrl, categoryHint = '') {
  const category = inferCategory(product, categoryHint)
  const { current, compare } = displayPrice(product)
  const priceFields = mapPriceFields(current, compare)
  const sourceStockStatus = stockStatus(product.newStock, product.status)
  const variants = (product.newVariants || []).map((variant, index) =>
    normalizeVariant(product, variant, index, priceFields.final_price)
  )
  const sourceReference = product.reference ? String(product.reference) : ''
  const productSlug = product.slug || slugify(product.name)
  const images = (product.images || []).map((image, index) => ({
    source_url_tn: highQualityConvertyImage(image.lg || image.md || image.sm || ''),
    source_url_global: '',
    chosen_source_url: '',
    storage_bucket: STORAGE_BUCKET,
    suggested_path: `products/${productSlug}/${index + 1}.webp`,
    is_primary: index === 0,
    match_status: 'tn_fallback',
  })).filter(image => image.source_url_tn)

  return {
    source: {
      url: sourceUrl,
      id: product._id || '',
      slug: productSlug,
      reference: sourceReference,
      category_ids: product.categories || [],
      raw_status: product.status || '',
      raw_stock_status: sourceStockStatus,
      currency: 'TND',
    },
    category: DEFAULT_CATEGORY_MAP[category] || DEFAULT_CATEGORY_MAP.face,
    product: {
      legacy_id: Number(product.reference) || null,
      category,
      slug: productSlug,
      sku: sourceReference || null,
      name_fr: product.name || '',
      name_ar: product.name || '',
      description_fr: stripHtml(product.description || ''),
      description_ar: stripHtml(product.description || ''),
      price: priceFields.price,
      sale_price: priceFields.sale_price,
      final_price: priceFields.final_price,
      source_price: current,
      source_compare_price: compare,
      discount_amount: priceFields.discount_amount,
      discount_percent: priceFields.discount_percent,
      image_url_tn: firstProductImage(product.images),
      image_url: firstProductImage(product.images),
      tag: priceFields.sale_price !== null ? 'promo' : '',
      source_stock_status: sourceStockStatus,
      stock_quantity: variants.length ? variants.length * safeImportStock() : safeImportStock(),
      stock_note: `Source stock status was ${sourceStockStatus}; import preview keeps product active with editable default stock ${DEFAULT_IMPORT_STOCK}.`,
      is_active: true,
      is_featured: false,
      display_order: Math.abs(Number(product.order || product.reference || 0)),
    },
    product_images: images,
    variants,
    image_match: null,
  }
}

function isUsableGlobalImage(image) {
  const src = image?.src || ''
  if (!src) return false
  if (/placeHolder\.gif|logo\.svg|mobilelogo\.svg|600x500|1920x60|banner|wp-content\/uploads\/2025\/11\//i.test(src)) return false
  return /PRODUCTS|d1ak51|akinoncloud|wp-content\/uploads/i.test(src)
}

function dedupeBy(items, keyFn) {
  const seen = new Set()
  return items.filter(item => {
    const key = keyFn(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function globalSlugFromUrl(url) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() || ''
  } catch {
    return ''
  }
}

function buildGlobalCandidates(globalUrls) {
  return globalUrls.map(url => {
    const slug = globalSlugFromUrl(url)
    return {
      url,
      slug,
      normalized_slug: normalizeKey(slug),
    }
  }).filter(candidate => candidate.slug)
}

function scoreImageCandidate(product, candidate) {
  const productName = product.product.name_fr
  const productSlug = product.product.slug
  const reasons = []
  let score = 0

  if (candidate.normalized_slug === normalizeKey(productSlug)) {
    score = Math.max(score, 0.96)
    reasons.push('slug match')
  }

  if (candidate.normalized_slug === normalizeKey(productName)) {
    score = Math.max(score, 0.94)
    reasons.push('exact name match')
  }

  const sourceSku = product.product.sku || ''
  if (sourceSku && new RegExp(`(^|-)${sourceSku}($|-)`).test(candidate.normalized_slug)) {
    score = Math.max(score, 0.9)
    reasons.push('SKU/reference match')
  }

  const similarity = Math.max(
    tokenSimilarity(productName, candidate.slug),
    tokenSimilarity(productSlug, candidate.slug)
  )
  if (similarity >= 0.5) {
    score = Math.max(score, Number((0.45 + similarity * 0.4).toFixed(2)))
    reasons.push('partial match')
  }

  return {
    ...candidate,
    confidence_score: Number(score.toFixed(2)),
    match_reasons: reasons,
  }
}

function chooseGlobalCandidate(product, candidates) {
  const scored = candidates
    .map(candidate => scoreImageCandidate(product, candidate))
    .filter(candidate => candidate.confidence_score >= 0.55)
    .sort((a, b) => b.confidence_score - a.confidence_score || a.slug.length - b.slug.length)

  return scored[0] || null
}

function classifyImageMatch(candidate, imageCount) {
  if (!candidate) return 'missing'
  if (candidate.confidence_score >= 0.9 && imageCount > 0) return 'matched'
  if (candidate.confidence_score >= 0.75 && imageCount > 0) return 'uncertain'
  return imageCount > 0 ? 'uncertain' : 'missing'
}

async function extractGlobalImages(page, product, candidate, failedPages) {
  if (!candidate) return null

  try {
    const data = await readPageData(page, candidate.url)
    const images = dedupeBy([
      ...data.metaImages.map(src => ({ alt: product.product.name_fr, src })),
      ...data.images,
    ].filter(isUsableGlobalImage), image => image.src)

    const preferredImages = images
      .map(image => ({
        alt: image.alt || '',
        source_url: image.src,
        alt_similarity: tokenSimilarity(product.product.name_fr, image.alt || ''),
      }))
      .sort((a, b) => b.alt_similarity - a.alt_similarity)

    const status = classifyImageMatch(candidate, preferredImages.length)
    return {
      product_slug: product.product.slug,
      product_name: product.product.name_fr,
      candidate_url: candidate.url,
      candidate_slug: candidate.slug,
      match_status: status,
      confidence_score: candidate.confidence_score,
      match_reasons: candidate.match_reasons,
      chosen_image_url: status === 'matched' ? preferredImages[0]?.source_url || '' : '',
      candidate_images: preferredImages.slice(0, 8),
      note: status === 'matched'
        ? 'High-confidence image match. Dry run only; image would be downloaded and uploaded to Supabase Storage after approval.'
        : 'Image candidate needs manual approval before any download/upload.',
    }
  } catch (error) {
    failedPages.push({ url: candidate.url, source: 'flormar.com', error: error.message })
    return {
      product_slug: product.product.slug,
      product_name: product.product.name_fr,
      candidate_url: candidate.url,
      candidate_slug: candidate.slug,
      match_status: 'failed',
      confidence_score: candidate.confidence_score,
      match_reasons: candidate.match_reasons,
      chosen_image_url: '',
      candidate_images: [],
      note: `Failed to read flormar.com image page: ${error.message}`,
    }
  }
}

async function crawlTunisiaCatalog(page) {
  const failedPages = []
  const tnSitemapXml = await fetchText(TN_SITEMAP_URL)
  const sitemapProductUrls = extractLocs(tnSitemapXml)
    .filter(url => url.startsWith(`${TN_ORIGIN}/product/`))
  const sitemapCategoryUrls = extractLocs(tnSitemapXml)
    .filter(url => url.startsWith(`${TN_ORIGIN}/category/`))

  const productSeedByUrl = new Map()
  for (const url of sitemapProductUrls) productSeedByUrl.set(url, { url, category: '' })
  for (const product of CATEGORY_VISIBLE_PRODUCT_URLS) {
    productSeedByUrl.set(product.url, product)
  }

  const maxProducts = Number(argValue('--max-products', '0'))
  const productSeeds = [...productSeedByUrl.values()]
  const seedsToCrawl = maxProducts > 0 ? productSeeds.slice(0, maxProducts) : productSeeds

  const categorySnapshots = []
  for (const categoryUrl of sitemapCategoryUrls) {
    const key = globalSlugFromUrl(categoryUrl)
    try {
      const data = await readPageData(page, categoryUrl)
      categorySnapshots.push({
        url: categoryUrl,
        mapped_category: CATEGORY_PAGE_MAP[key]?.slug || '',
        visible_text_sample: data.text.slice(0, 1200),
      })
    } catch (error) {
      failedPages.push({ url: categoryUrl, source: 'flormar.tn', error: error.message })
    }
  }

  const products = []
  for (const [index, seed] of seedsToCrawl.entries()) {
    try {
      const data = await readPageData(page, seed.url)
      if (!data.productData) throw new Error('Missing productData JSON')
      products.push(normalizeProduct(data.productData, seed.url, seed.category || ''))
      if ((index + 1) % 10 === 0) console.log(`flormar.tn dry crawl: ${index + 1}/${seedsToCrawl.length} products`)
    } catch (error) {
      failedPages.push({ url: seed.url, source: 'flormar.tn', error: error.message })
    }
  }

  products.sort((a, b) => a.category.display_order - b.category.display_order || a.product.display_order - b.product.display_order || a.product.name_fr.localeCompare(b.product.name_fr))

  return {
    products,
    failedPages,
    discovered: {
      sitemap_url: TN_SITEMAP_URL,
      product_urls_found_in_sitemap: sitemapProductUrls.length,
      product_urls_found_in_rendered_categories: CATEGORY_VISIBLE_PRODUCT_URLS.length,
      unique_product_urls_crawled: seedsToCrawl.length,
      category_urls_found_in_sitemap: sitemapCategoryUrls.length,
      category_urls: sitemapCategoryUrls,
      category_snapshots: categorySnapshots,
    },
  }
}

async function crawlGlobalImageMatches(page, products, failedPages) {
  const globalUrls = []
  for (const sitemapUrl of GLOBAL_SITEMAP_URLS) {
    try {
      const xml = await fetchText(sitemapUrl)
      globalUrls.push(...extractLocs(xml).filter(url => url.startsWith(`${GLOBAL_ORIGIN}/`)))
    } catch (error) {
      failedPages.push({ url: sitemapUrl, source: 'flormar.com', error: error.message })
    }
  }

  const candidates = buildGlobalCandidates(dedupeBy(globalUrls, url => url))
  const matches = []
  const maxImagePages = Number(argValue('--max-image-pages', '0'))
  let loadedPages = 0

  for (const [index, product] of products.entries()) {
    const candidate = chooseGlobalCandidate(product, candidates)
    if (!candidate || candidate.confidence_score < 0.75) {
      const match = {
        product_slug: product.product.slug,
        product_name: product.product.name_fr,
        candidate_url: candidate?.url || '',
        candidate_slug: candidate?.slug || '',
        match_status: 'missing',
        confidence_score: candidate?.confidence_score || 0,
        match_reasons: candidate?.match_reasons || [],
        chosen_image_url: '',
        candidate_images: [],
        note: 'No reliable flormar.com image candidate found.',
      }
      product.image_match = match
      matches.push(match)
      continue
    }

    if (maxImagePages > 0 && loadedPages >= maxImagePages) {
      const match = {
        product_slug: product.product.slug,
        product_name: product.product.name_fr,
        candidate_url: candidate.url,
        candidate_slug: candidate.slug,
        match_status: 'not_loaded',
        confidence_score: candidate.confidence_score,
        match_reasons: candidate.match_reasons,
        chosen_image_url: '',
        candidate_images: [],
        note: `Skipped because --max-image-pages=${maxImagePages} was reached.`,
      }
      product.image_match = match
      matches.push(match)
      continue
    }

    await sleep(700)
    const match = await extractGlobalImages(page, product, candidate, failedPages)
    loadedPages += 1
    product.image_match = match

    if (match?.match_status === 'matched' && match.chosen_image_url) {
      product.product.image_url_global = match.chosen_image_url
      product.product.image_url = match.chosen_image_url
      if (product.product_images[0]) {
        product.product_images[0].source_url_global = match.chosen_image_url
        product.product_images[0].chosen_source_url = match.chosen_image_url
        product.product_images[0].match_status = 'global_matched'
        product.product_images[0].match_reasons = match.match_reasons
        product.product_images[0].confidence_score = match.confidence_score
      }
    }

    matches.push(match)
    if ((index + 1) % 10 === 0) console.log(`flormar.com image match: ${index + 1}/${products.length} products`)
  }

  return {
    matches,
    discovered: {
      sitemap_urls: GLOBAL_SITEMAP_URLS,
      product_image_urls_found_in_sitemaps: globalUrls.length,
      unique_global_candidates: candidates.length,
    },
  }
}

function duplicateReport(products) {
  const bySlug = new Map()
  const byName = new Map()
  const bySku = new Map()

  for (const item of products) {
    const slug = item.product.slug
    const name = exactNameKey(item.product.name_fr)
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

function buildCategories(products) {
  const slugs = new Set(products.map(item => item.category.slug))
  return [...slugs]
    .map(slug => DEFAULT_CATEGORY_MAP[slug] || { slug, name_fr: slug, name_ar: slug, display_order: 99 })
    .sort((a, b) => a.display_order - b.display_order)
    .map(category => ({
      ...category,
      image_url: '',
      is_active: true,
    }))
}

function makeReport(products, imageMatches, failedPages, discovered) {
  const categories = buildCategories(products)
  const variants = products.flatMap(product => product.variants)
  const missingImages = products
    .filter(product => !product.product.image_url_tn && !product.image_match?.chosen_image_url)
    .map(product => product.source.url)
  const missingPrices = products
    .filter(product => product.product.final_price === null)
    .map(product => product.source.url)
  const missingProductSkus = products
    .filter(product => !product.product.sku)
    .map(product => product.source.url)
  const missingVariantSkus = variants
    .filter(variant => !variant.sku)
    .map(variant => ({
      product_reference: variant.source_reference,
      shade: variant.shade_name,
      suggested_sku: variant.suggested_sku,
    }))
  const duplicates = duplicateReport(products)

  return {
    dry_run: true,
    writes_to_supabase: false,
    image_uploads: false,
    sources: {
      catalog: TN_ORIGIN,
      high_quality_images: GLOBAL_ORIGIN,
    },
    schema_mapping: {
      categories: ['slug', 'name_fr', 'name_ar', 'display_order', 'image_url', 'is_active'],
      products: ['category', 'slug', 'sku', 'name_fr', 'name_ar', 'description_fr', 'description_ar', 'price', 'sale_price', 'image_url', 'stock_quantity', 'is_active', 'is_featured'],
      product_variants: ['product_slug', 'shade_name', 'sku', 'color_hex', 'image_url', 'price', 'stock_quantity', 'is_active', 'display_order'],
      product_images_storage: STORAGE_BUCKET,
    },
    stock_policy: `Scraped stock is recorded as source_stock_status only. Mapped stock uses editable default ${DEFAULT_IMPORT_STOCK}, and products/shades stay active.`,
    discovered,
    totals: {
      categories_found: categories.length,
      products_found: products.length,
      variants_found: variants.length,
      matched_images: imageMatches.filter(match => match.match_status === 'matched').length,
      uncertain_image_matches: imageMatches.filter(match => match.match_status === 'uncertain').length,
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

function toCsvValue(value) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function makeProductCsv(products) {
  const rows = [[
    'source_url',
    'category',
    'slug',
    'name',
    'sku',
    'price',
    'sale_price',
    'final_price',
    'discount_percent',
    'image_url',
    'source_stock_status',
    'mapped_stock_quantity',
    'variant_count',
  ]]

  for (const item of products) {
    rows.push([
      item.source.url,
      item.product.category,
      item.product.slug,
      item.product.name_fr,
      item.product.sku || '',
      item.product.price,
      item.product.sale_price,
      item.product.final_price,
      item.product.discount_percent,
      item.product.image_url,
      item.product.source_stock_status,
      item.product.stock_quantity,
      item.variants.length,
    ])
  }

  return rows.map(row => row.map(toCsvValue).join(',')).join('\n')
}

function makeVariantCsv(products) {
  const rows = [[
    'product_slug',
    'product_name',
    'shade_name',
    'sku',
    'suggested_sku',
    'optional_variant_price',
    'source_stock_status',
    'mapped_stock_quantity',
    'image_url',
  ]]

  for (const item of products) {
    for (const variant of item.variants) {
      rows.push([
        item.product.slug,
        item.product.name_fr,
        variant.shade_name,
        variant.sku || '',
        variant.suggested_sku || '',
        variant.price,
        variant.source_stock_status,
        variant.stock_quantity,
        variant.image_url,
      ])
    }
  }

  return rows.map(row => row.map(toCsvValue).join(',')).join('\n')
}

function makeImageCsv(imageMatches) {
  const rows = [[
    'product_slug',
    'product_name',
    'match_status',
    'confidence_score',
    'match_reasons',
    'candidate_url',
    'chosen_image_url',
    'note',
  ]]

  for (const match of imageMatches) {
    rows.push([
      match.product_slug,
      match.product_name,
      match.match_status,
      match.confidence_score,
      match.match_reasons.join('; '),
      match.candidate_url,
      match.chosen_image_url,
      match.note,
    ])
  }

  return rows.map(row => row.map(toCsvValue).join(',')).join('\n')
}

async function main() {
  if (hasArg('--import') || hasArg('--apply')) {
    throw new Error('This script is dry-run only. It never writes to Supabase or uploads images.')
  }

  if (!Number.isFinite(DEFAULT_IMPORT_STOCK) || DEFAULT_IMPORT_STOCK < 0) {
    throw new Error('--default-stock must be 0 or a positive number')
  }

  const browser = await launchBrowser()
  const context = await browser.newContext({ userAgent: USER_AGENT })
  const tnPage = await context.newPage()
  const globalPage = await context.newPage()
  const failedPages = []

  try {
    const tn = await crawlTunisiaCatalog(tnPage)
    failedPages.push(...tn.failedPages)
    const global = await crawlGlobalImageMatches(globalPage, tn.products, failedPages)

    const categories = buildCategories(tn.products)
    const report = makeReport(tn.products, global.matches, failedPages, {
      flormar_tn: tn.discovered,
      flormar_com: global.discovered,
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await mkdir(OUTPUT_DIR, { recursive: true })
    const jsonPath = path.join(OUTPUT_DIR, `flormar-hybrid-dry-run-${timestamp}.json`)
    const productsCsvPath = path.join(OUTPUT_DIR, `flormar-hybrid-products-${timestamp}.csv`)
    const variantsCsvPath = path.join(OUTPUT_DIR, `flormar-hybrid-variants-${timestamp}.csv`)
    const imagesCsvPath = path.join(OUTPUT_DIR, `flormar-hybrid-image-matches-${timestamp}.csv`)
    const reportPath = path.join(OUTPUT_DIR, `flormar-hybrid-report-${timestamp}.json`)
    const latestPath = path.join(OUTPUT_DIR, 'latest-hybrid-summary.json')

    const output = {
      report,
      mapped_schema_preview: {
        categories,
        products: tn.products.map(item => item.product),
        product_variants: tn.products.flatMap(item => item.variants.map(variant => ({
          product_slug: item.product.slug,
          ...variant,
        }))),
        product_images: tn.products.flatMap(item => item.product_images.map(image => ({
          product_slug: item.product.slug,
          ...image,
        }))),
        image_matches: global.matches,
      },
      products: tn.products,
    }

    await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
    await writeFile(productsCsvPath, `${makeProductCsv(tn.products)}\n`, 'utf8')
    await writeFile(variantsCsvPath, `${makeVariantCsv(tn.products)}\n`, 'utf8')
    await writeFile(imagesCsvPath, `${makeImageCsv(global.matches)}\n`, 'utf8')
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    await writeFile(latestPath, `${JSON.stringify({
      ...report,
      files: {
        json: jsonPath,
        report: reportPath,
        products_csv: productsCsvPath,
        variants_csv: variantsCsvPath,
        image_matches_csv: imagesCsvPath,
      },
    }, null, 2)}\n`, 'utf8')

    console.log(JSON.stringify({
      ...report,
      files: {
        json: jsonPath,
        report: reportPath,
        products_csv: productsCsvPath,
        variants_csv: variantsCsvPath,
        image_matches_csv: imagesCsvPath,
      },
    }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
