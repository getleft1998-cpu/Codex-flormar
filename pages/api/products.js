import { getSupabasePublic } from '../../lib/supabase'
import { toClientCategory, toClientProduct } from '../../lib/transformers'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const supabase = getSupabasePublic()
    const [categoryResult, productResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true }),
      supabase
        .from('products')
        .select('*, categories(slug,name_fr,name_ar), product_variants(*)')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ])

    if (categoryResult.error) throw new Error(categoryResult.error.message)
    if (productResult.error) throw new Error(productResult.error.message)

    return res.status(200).json({
      categories: (categoryResult.data || []).map(toClientCategory),
      products: (productResult.data || []).map(toClientProduct),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
