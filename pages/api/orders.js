import { getSupabasePublic } from '../../lib/supabase'
import { toClientOrder } from '../../lib/transformers'

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null

  const normalized = []

  for (const item of items) {
    const productId = Number(item.id || item.productId)
    const rawVariantId = item.variantId || item.variant_id || ''
    const variantId = rawVariantId === '' || rawVariantId === null ? null : Number(rawVariantId)
    const qty = Number(item.qty)

    if (
      !Number.isInteger(productId) ||
      productId < 1 ||
      (variantId !== null && (!Number.isInteger(variantId) || variantId < 1)) ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 99
    ) {
      return null
    }

    normalized.push(
      variantId
        ? { id: productId, variant_id: variantId, qty }
        : { id: productId, qty }
    )
  }

  return normalized
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { customer, items } = req.body
    const normalizedItems = normalizeItems(items)
    const requiredCustomerFields = ['name', 'phone', 'governorate', 'city', 'address']

    if (
      !customer ||
      !normalizedItems ||
      requiredCustomerFields.some(field => !String(customer[field] || '').trim())
    ) {
      return res.status(400).json({ error: 'Invalid order' })
    }

    const supabase = getSupabasePublic()

    const { data, error } = await supabase.rpc('create_order', {
      p_customer_name: customer.name.trim(),
      p_customer_phone: customer.phone.trim(),
      p_governorate: customer.governorate.trim(),
      p_city: customer.city.trim(),
      p_address: customer.address.trim(),
      p_items: normalizedItems,
    })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ order: toClientOrder(data) })
  }
  res.status(405).end()
}
