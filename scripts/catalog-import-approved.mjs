import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const execFileAsync = promisify(execFile)
const DEFAULT_STOCK = Number(readArg('--default-stock', '20'))

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

async function runDryRun() {
  await execFileAsync(process.execPath, ['scripts/catalog-dry-run.mjs'], {
    cwd: process.cwd(),
    windowsHide: true,
  })

  const summary = JSON.parse(await readFile(path.join('catalog-preview', 'latest-summary.json'), 'utf8'))
  const previewPath = path.resolve(summary.files.json)
  const preview = JSON.parse(await readFile(previewPath, 'utf8'))
  return { summary, preview, previewPath }
}

function importStock(stockStatus) {
  if (stockStatus === 'out_of_stock') return 0
  if (stockStatus === 'in_stock') return DEFAULT_STOCK
  return 0
}

function productPayload(item) {
  const hasVariants = item.variants.length > 0
  const variantStock = item.variants.reduce((sum, variant) => sum + importStock(variant.stock_status), 0)

  return {
    legacy_id: Number(item.source.reference) || null,
    category: item.product.category,
    slug: item.product.slug,
    sku: item.product.sku,
    name_fr: item.product.name_fr,
    name_ar: item.product.name_ar,
    description_fr: item.product.description_fr,
    description_ar: item.product.description_ar,
    price: item.product.price,
    image_url: item.product.image_url,
    tag: item.product.tag,
    stock_quantity: hasVariants ? variantStock : importStock(item.product.stock_status),
    is_active: item.product.is_active,
    display_order: item.product.display_order,
  }
}

function variantPayload(item, variant, productId, existingVariant) {
  const sku = variant.sku || variant.suggested_sku || ''
  const variantPrice = variant.price !== null && Number(variant.price) !== Number(item.product.price)
    ? variant.price
    : ''

  return {
    id: existingVariant?.id || '',
    product_id: productId,
    shade_name: variant.shade_name,
    sku,
    color_hex: variant.color_hex || '',
    image_url: variant.image_url || item.product.image_url || '',
    price: variantPrice,
    stock_quantity: importStock(variant.stock_status),
    is_active: variant.is_active,
    display_order: variant.display_order,
  }
}

async function main() {
  if (!hasArg('--apply')) {
    throw new Error('Refusing to import. Re-run with --apply after approving the dry-run preview.')
  }

  if (!Number.isFinite(DEFAULT_STOCK) || DEFAULT_STOCK < 0) {
    throw new Error('--default-stock must be a positive number or 0')
  }

  const env = await readEnvFile('.env.local')
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'ADMIN_DB_SECRET']
  const missing = required.filter(key => !env[key])
  if (missing.length) throw new Error(`Missing required local env vars: ${missing.join(', ')}`)

  const { summary, preview, previewPath } = await runDryRun()
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })

  async function adminRpc(name, args = {}) {
    const { data, error } = await supabase.rpc(name, {
      p_secret: env.ADMIN_DB_SECRET,
      ...args,
    })
    if (error) throw new Error(`${name}: ${error.message}`)
    return data
  }

  const dashboard = await adminRpc('admin_get_dashboard')
  const variantBySku = new Map()

  for (const product of dashboard.products || []) {
    for (const variant of product.variants || []) {
      if (variant.sku) variantBySku.set(variant.sku, variant)
    }
  }

  const result = {
    dry_run_file: previewPath,
    imported_products: [],
    imported_variants: [],
    failed: [],
    default_stock_for_available_items: DEFAULT_STOCK,
    source_report: summary.totals,
  }

  for (const item of preview.products) {
    try {
      const savedProduct = await adminRpc('admin_upsert_product', {
        p_product: productPayload(item),
      })

      result.imported_products.push({
        id: savedProduct.id,
        legacy_id: savedProduct.legacy_id,
        slug: savedProduct.slug,
        name: savedProduct.name_fr,
        price: Number(savedProduct.price),
      })

      for (const variant of item.variants) {
        const sku = variant.sku || variant.suggested_sku || ''
        const savedVariant = await adminRpc('admin_upsert_variant', {
          p_variant: variantPayload(item, variant, savedProduct.id, variantBySku.get(sku)),
        })
        if (savedVariant.sku) variantBySku.set(savedVariant.sku, savedVariant)
        result.imported_variants.push({
          id: savedVariant.id,
          product_id: savedProduct.id,
          shade: savedVariant.shade_name,
          sku: savedVariant.sku,
          stock_quantity: savedVariant.stock_quantity,
        })
      }
    } catch (error) {
      result.failed.push({
        url: item.source.url,
        name: item.product.name_fr,
        error: error.message,
      })
    }
  }

  const outputPath = path.join('catalog-preview', `flormar-tn-import-result-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    imported_products: result.imported_products.length,
    imported_variants: result.imported_variants.length,
    failed: result.failed.length,
    default_stock_for_available_items: DEFAULT_STOCK,
    output: outputPath,
  }, null, 2))

  if (result.failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
