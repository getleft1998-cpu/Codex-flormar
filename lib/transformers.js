export function toClientCategory(category) {
  return {
    id: category.id,
    slug: category.slug,
    nameFr: category.name_fr,
    nameAr: category.name_ar,
    heroFr: category.hero_fr,
    heroAr: category.hero_ar,
    descriptionFr: category.description_fr,
    descriptionAr: category.description_ar,
    imageUrl: category.image_url,
    displayOrder: category.display_order,
    isActive: category.is_active,
  }
}

function highQualityImage(url = '') {
  return String(url || '').replace(/_sm(\.(?:webp|jpg|jpeg|png))(?:\?.*)?$/i, '_lg$1')
}

export function toClientVariant(variant) {
  const imageUrl = highQualityImage(variant.image_url || '')

  return {
    id: variant.id,
    productId: variant.product_id,
    shadeName: variant.shade_name || '',
    sku: variant.sku || '',
    colorHex: variant.color_hex || '',
    image: imageUrl,
    imageUrl,
    price: variant.price === null || variant.price === undefined ? null : Number(variant.price),
    stockQuantity: Number(variant.stock_quantity || 0),
    inStock: variant.is_active !== false && Number(variant.stock_quantity || 0) > 0,
    isActive: variant.is_active !== false,
    displayOrder: variant.display_order || 0,
  }
}

export function toClientProduct(product) {
  const category = product.category || product.categories?.slug
  const variants = (product.variants || product.product_variants || []).map(toClientVariant)
  const activeVariants = variants.filter(variant => variant.isActive)
  const variantStock = activeVariants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
  const hasVariants = activeVariants.length > 0

  const imageUrl = highQualityImage(product.image_url || '')

  return {
    id: product.id,
    legacyId: product.legacy_id,
    category,
    slug: product.slug,
    sku: product.sku || '',
    nameFr: product.name_fr,
    nameAr: product.name_ar,
    descriptionFr: product.description_fr || '',
    descriptionAr: product.description_ar || '',
    price: Number(product.price || 0),
    image: imageUrl,
    imageUrl,
    tag: product.tag || '',
    variants,
    hasVariants,
    stockQuantity: hasVariants ? variantStock : Number(product.stock_quantity || 0),
    inStock: product.is_active !== false && (hasVariants ? variantStock > 0 : Number(product.stock_quantity || 0) > 0),
    isActive: product.is_active !== false,
    displayOrder: product.display_order || 0,
  }
}

export function toClientOrderItem(item) {
  return {
    id: item.product_id || item.id,
    productId: item.product_id,
    variantId: item.product_variant_id,
    nameFr: item.product_name_fr,
    nameAr: item.product_name_ar,
    shadeName: item.variant_shade_name || item.variant_snapshot?.shade_name || '',
    sku: item.variant_sku || item.variant_snapshot?.sku || '',
    colorHex: item.variant_color_hex || item.variant_snapshot?.color_hex || '',
    price: Number(item.unit_price || 0),
    qty: Number(item.quantity || 0),
    total: Number(item.line_total || 0),
  }
}

export function toClientOrder(order) {
  return {
    ...order,
    total: Number(order.total || 0),
    items: (order.items || order.order_items || []).map(toClientOrderItem),
  }
}
