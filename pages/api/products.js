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
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('products')
        .select('*, categories(slug,name_fr,name_ar), product_variants(*)')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ])

    if (categoryResult.error) throw new Error(categoryResult.error.message)
    if (productResult.error) throw new Error(productResult.error.message)

    const categories = (categoryResult.data || []).map(toClientCategory)
    const activeCategorySlugs = new Set(categories.map(category => category.slug))
    const products = (productResult.data || [])
      .map(toClientProduct)
      .filter(product => activeCategorySlugs.has(product.category))

    const settingsResult = await supabase.rpc('get_store_settings')
    const settings = settingsResult.error ? {} : (settingsResult.data || {})

    return res.status(200).json({
      categories,
      products,
      settings: settings || {},
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
