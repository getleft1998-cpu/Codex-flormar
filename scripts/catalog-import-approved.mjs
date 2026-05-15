import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const STORAGE_BUCKET = 'product-images'
const DEFAULT_STOCK = Number(readArg('--default-stock', '20'))
const APPROVED_UNCERTAIN_IMAGE_SLUGS = new Set(['dewy-lip-glaze-1'])
const STORAGE_PATH_PREFIX = readArg('--storage-prefix', 'catalog-import-approved')

function readArg(name, fallback = '') {
  const prefix = `${name}=`
  const found = process.argv.find(arg => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

async function readEnvFile(filePath) {
  const content = await readFile(filePath, 'utf8')
  const env = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '')
  }

  return env
}

async function loadPreview() {
  const explicitPreview = readArg('--preview', '')
  if (explicitPreview) {
    const previewPath = path.resolve(explicitPreview)
    return {
      previewPath,
      preview: JSON.parse(await readFile(previewPath, 'utf8')),
    }
  }

  const summaryPath = path.join('catalog-preview', 'latest-hybrid-summary.json')
  const summary = JSON.parse(await readFile(summaryPath, 'utf8'))
  if (!summary?.files?.json) {
    throw new Error('Missing catalog-preview/latest-hybrid-summary.json files.json')
  }

  const previewPath = path.resolve(summary.files.json)
  return {
    previewPath,
    preview: JSON.parse(await readFile(previewPath, 'utf8')),
  }
}

function normalizeName(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extFromContentType(contentType = '') {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  return 'jpg'
}

function storageUrl(supabase, storagePath) {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

function withStoragePrefix(storagePath) {
  const prefix = STORAGE_PATH_PREFIX.replace(/^\/+|\/+$/g, '')
  return prefix ? `${prefix}/${storagePath}` : storagePath
}

function approvedImageSource(item, match) {
  if (match?.match_status === 'matched' && match.chosen_image_url) {
    return {
      sourceUrl: match.chosen_image_url,
      source: 'flormar.com',
      reason: match.match_reasons || [],
      confidence: match.confidence_score || 0,
    }
  }

  if (APPROVED_UNCERTAIN_IMAGE_SLUGS.has(item.product.slug) && match?.candidate_images?.[0]?.source_url) {
    return {
      sourceUrl: match.candidate_images[0].source_url,
      source: 'flormar.com approved uncertain',
      reason: [...(match.match_reasons || []), 'manual approval'],
      confidence: match.confidence_score || 0,
    }
  }

  if (item.product.image_url_tn || item.product.image_url) {
    return {
      sourceUrl: item.product.image_url_tn || item.product.image_url,
      source: 'flormar.tn fallback',
      reason: ['fallback source image'],
      confidence: 1,
    }
  }

  return null
}

async function uploadImage(supabase, sourceUrl, storagePath) {
  const response = await fetch(sourceUrl, {
    headers: { 'user-agent': 'FlormarCodexImport/1.0' },
  })
  if (!response.ok) throw new Error(`Image download failed ${response.status}: ${sourceUrl}`)

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await response.arrayBuffer())
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12)
  const ext = extFromContentType(contentType)
  const finalPath = withStoragePrefix(storagePath.replace(/\.[a-z0-9]+$/i, `-${hash}.${ext}`))

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(finalPath, buffer, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`Storage upload failed for ${finalPath}: ${error.message}`)

  return {
    path: finalPath,
    publicUrl: storageUrl(supabase, finalPath),
    contentType,
    bytes: buffer.length,
  }
}

function buildIndexes(snapshot) {
  const categoryBySlug = new Map()
  const productById = new Map()
  const productByLegacyId = new Map()
  const productBySlug = new Map()
  const productBySku = new Map()
  const variantBySku = new Map()
  const variantByProductShade = new Map()

  for (const category of snapshot.categories || []) {
    if (category.slug) categoryBySlug.set(category.slug, category)
  }

  for (const product of snapshot.products || []) {
    productById.set(String(product.id), product)
    if (product.legacy_id !== null && product.legacy_id !== undefined) productByLegacyId.set(String(product.legacy_id), product)
    if (product.slug) productBySlug.set(product.slug, product)
    if (product.sku) productBySku.set(String(product.sku), product)
    for (const variant of product.variants || []) {
      if (variant.sku) variantBySku.set(String(variant.sku), variant)
      variantByProductShade.set(`${product.id}:${normalizeName(variant.shade_name)}`, variant)
    }
  }

  return {
    categoryBySlug,
    productById,
    productByLegacyId,
    productBySlug,
    productBySku,
    variantBySku,
    variantByProductShade,
  }
}

function findExistingProduct(indexes, item) {
  const legacyId = item.product.legacy_id ?? item.source.reference
  const sku = item.product.sku || item.source.reference

  return (
    (legacyId !== null && legacyId !== undefined && indexes.productByLegacyId.get(String(legacyId))) ||
    indexes.productBySlug.get(item.product.slug) ||
    (sku ? indexes.productBySku.get(String(sku)) : null) ||
    null
  )
}

function findExistingVariant(indexes, savedProductId, variant) {
  const sku = variant.sku || variant.suggested_sku
  return (
    (sku ? indexes.variantBySku.get(String(sku)) : null) ||
    indexes.variantByProductShade.get(`${savedProductId}:${normalizeName(variant.shade_name)}`) ||
    null
  )
}

function categoryPayload(category, existingCategory) {
  return {
    id: existingCategory?.id,
    slug: category.slug,
    name_fr: category.name_fr,
    name_ar: category.name_ar,
    hero_fr: existingCategory?.hero_fr ?? '',
    hero_ar: existingCategory?.hero_ar ?? '',
    description_fr: existingCategory?.description_fr ?? '',
    description_ar: existingCategory?.description_ar ?? '',
    image_url: existingCategory?.image_url || category.image_url || '',
    display_order: existingCategory?.display_order ?? category.display_order ?? 0,
    is_active: existingCategory?.is_active ?? true,
  }
}

function productPayload(item, existingProduct, category, imageUrl) {
  const hasVariants = item.variants.length > 0
  const importedStock = hasVariants ? item.variants.length * DEFAULT_STOCK : DEFAULT_STOCK

  return {
    id: existingProduct?.id,
    legacy_id: item.product.legacy_id ?? (Number(item.source.reference) || null),
    category: category.slug,
    slug: existingProduct?.slug || item.product.slug,
    sku: existingProduct?.sku || item.product.sku || item.source.reference || '',
    name_fr: item.product.name_fr,
    name_ar: item.product.name_ar,
    description_fr: item.product.description_fr,
    description_ar: item.product.description_ar,
    price: item.product.price,
    sale_price: item.product.sale_price ?? '',
    image_url: imageUrl,
    tag: existingProduct?.tag ?? item.product.tag ?? '',
    stock_quantity: existingProduct?.stock_quantity ?? importedStock,
    is_active: existingProduct?.is_active ?? true,
    is_featured: existingProduct?.is_featured ?? false,
    display_order: existingProduct?.display_order ?? item.product.display_order ?? 0,
  }
}

function variantPayload(item, variant, productId, existingVariant, imageUrl) {
  const sku = variant.sku || variant.suggested_sku || ''
  const sourceFinalPrice = variant.source_price ?? item.product.final_price
  const variantPrice = sourceFinalPrice !== null && Number(sourceFinalPrice) !== Number(item.product.final_price)
    ? sourceFinalPrice
    : ''

  return {
    id: existingVariant?.id,
    product_id: productId,
    shade_name: variant.shade_name,
    sku: existingVariant?.sku || sku,
    color_hex: existingVariant?.color_hex || variant.color_hex || '',
    image_url: imageUrl,
    price: existingVariant?.price ?? variantPrice,
    stock_quantity: existingVariant?.stock_quantity ?? DEFAULT_STOCK,
    is_active: existingVariant?.is_active ?? true,
    display_order: existingVariant?.display_order ?? variant.display_order ?? 0,
  }
}

async function adminRpc(supabase, env, name, args = {}) {
  const { data, error } = await supabase.rpc(name, {
    p_secret: env.ADMIN_DB_SECRET,
    ...args,
  })
  if (error) throw new Error(`${name}: ${error.message}`)
  return data
}

async function countRows(supabase, env) {
  const dashboard = await adminRpc(supabase, env, 'admin_get_dashboard')
  return {
    orders: (dashboard.orders || []).length,
    products: (dashboard.products || []).length,
    variants: (dashboard.products || []).reduce((sum, product) => sum + (product.variants || []).length, 0),
    categories: (dashboard.categories || []).length,
  }
}

async function main() {
  if (!hasArg('--apply')) {
    throw new Error('Refusing to import. Re-run with --apply after approving the dry-run preview.')
  }

  if (!Number.isFinite(DEFAULT_STOCK) || DEFAULT_STOCK < 0) {
    throw new Error('--default-stock must be 0 or a positive number')
  }

  const envPath = readArg('--env', '.env.local')
  const env = await readEnvFile(envPath)
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'ADMIN_DB_SECRET',
  ]
  const missing = required.filter(key => !env[key])
  if (missing.length) throw new Error(`Missing required local env vars: ${missing.join(', ')}`)

  const { preview, previewPath } = await loadPreview()
  const report = preview.report || {}
  if (!report.dry_run || report.writes_to_supabase !== false) {
    throw new Error('Preview does not look like the approved hybrid dry-run output.')
  }

  const storageKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, storageKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const beforeCounts = await countRows(supabase, env)
  const dashboard = await adminRpc(supabase, env, 'admin_get_dashboard')
  const indexes = buildIndexes(dashboard)

  const result = {
    preview_file: previewPath,
    before_counts: beforeCounts,
    after_counts: null,
    imported_categories: [],
    imported_products: [],
    imported_variants: [],
    uploaded_images: [],
    preserved: {
      orders_before: beforeCounts.orders,
      product_stock_values: 0,
      variant_stock_values: 0,
      product_admin_fields: 0,
      variant_admin_fields: 0,
    },
    failed: [],
  }

  const categories = preview.mapped_schema_preview?.categories || []
  for (const category of categories) {
    try {
      const existingCategory = indexes.categoryBySlug.get(category.slug)
      const savedCategory = await adminRpc(supabase, env, 'admin_upsert_category', {
        p_category: categoryPayload(category, existingCategory),
      })
      indexes.categoryBySlug.set(savedCategory.slug, savedCategory)
      result.imported_categories.push({
        id: savedCategory.id,
        slug: savedCategory.slug,
        action: existingCategory ? 'updated' : 'created',
      })
    } catch (error) {
      result.failed.push({ type: 'category', slug: category.slug, error: error.message })
    }
  }

  for (const item of preview.products || []) {
    try {
      const existingProduct = findExistingProduct(indexes, item)
      const category = indexes.categoryBySlug.get(item.product.category)
      if (!category) throw new Error(`Missing category: ${item.product.category}`)

      const approvedMainImage = approvedImageSource(item, item.image_match)
      const mainUpload = approvedMainImage
        ? await uploadImage(
            supabase,
            approvedMainImage.sourceUrl,
            `products/${item.product.slug}/main.jpg`
          )
        : null

      if (mainUpload) {
        result.uploaded_images.push({
          product_slug: item.product.slug,
          type: 'product',
          source: approvedMainImage.source,
          confidence: approvedMainImage.confidence,
          path: mainUpload.path,
          public_url: mainUpload.publicUrl,
        })
      }

      const savedProduct = await adminRpc(supabase, env, 'admin_upsert_product', {
        p_product: productPayload(item, existingProduct, category, mainUpload?.publicUrl || existingProduct?.image_url || ''),
      })

      result.imported_products.push({
        id: savedProduct.id,
        slug: savedProduct.slug,
        legacy_id: savedProduct.legacy_id,
        name: savedProduct.name_fr,
        action: existingProduct ? 'updated' : 'created',
      })

      if (existingProduct) {
        result.preserved.product_stock_values += 1
        result.preserved.product_admin_fields += 1
      }

      indexes.productById.set(String(savedProduct.id), savedProduct)
      if (savedProduct.legacy_id !== null && savedProduct.legacy_id !== undefined) indexes.productByLegacyId.set(String(savedProduct.legacy_id), savedProduct)
      if (savedProduct.slug) indexes.productBySlug.set(savedProduct.slug, savedProduct)
      if (savedProduct.sku) indexes.productBySku.set(String(savedProduct.sku), savedProduct)

      for (const variant of item.variants || []) {
        const existingVariant = findExistingVariant(indexes, savedProduct.id, variant)
        const variantSourceUrl = variant.image_url_tn || variant.image_url || approvedMainImage?.sourceUrl
        const variantUpload = variantSourceUrl
          ? await uploadImage(
              supabase,
              variantSourceUrl,
              `products/${item.product.slug}/variants/${variant.suggested_sku || variant.sku || variant.display_order}.jpg`
            )
          : mainUpload

        if (variantUpload) {
          result.uploaded_images.push({
            product_slug: item.product.slug,
            variant: variant.shade_name,
            type: 'variant',
            path: variantUpload.path,
            public_url: variantUpload.publicUrl,
          })
        }

        const savedVariant = await adminRpc(supabase, env, 'admin_upsert_variant', {
          p_variant: variantPayload(item, variant, savedProduct.id, existingVariant, variantUpload?.publicUrl || mainUpload?.publicUrl || ''),
        })

        result.imported_variants.push({
          id: savedVariant.id,
          product_id: savedProduct.id,
          shade: savedVariant.shade_name,
          sku: savedVariant.sku,
          action: existingVariant ? 'updated' : 'created',
        })

        if (existingVariant) {
          result.preserved.variant_stock_values += 1
          result.preserved.variant_admin_fields += 1
        }

        if (savedVariant.sku) indexes.variantBySku.set(String(savedVariant.sku), savedVariant)
        indexes.variantByProductShade.set(`${savedProduct.id}:${normalizeName(savedVariant.shade_name)}`, savedVariant)
      }
    } catch (error) {
      result.failed.push({
        type: 'product',
        url: item.source?.url,
        slug: item.product?.slug,
        name: item.product?.name_fr,
        error: error.message,
      })
    }
  }

  const afterCounts = await countRows(supabase, env)
  result.after_counts = afterCounts
  result.preserved.orders_after = afterCounts.orders
  result.preserved.orders_untouched = beforeCounts.orders === afterCounts.orders

  const outputPath = path.join('catalog-preview', `flormar-hybrid-import-result-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    preview_file: previewPath,
    output: outputPath,
    categories: result.imported_categories.length,
    products: result.imported_products.length,
    variants: result.imported_variants.length,
    images_uploaded: result.uploaded_images.length,
    failed: result.failed.length,
    before_counts: result.before_counts,
    after_counts: result.after_counts,
    orders_untouched: result.preserved.orders_untouched,
  }, null, 2))

  if (result.failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
