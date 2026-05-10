import { requireAdminAuth } from '../../lib/admin-auth'
import { callAdminRpc } from '../../lib/admin-db'
import { toClientCategory, toClientOrder, toClientProduct } from '../../lib/transformers'

export default async function handler(req, res) {
  if (!requireAdminAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const data = await callAdminRpc('admin_get_dashboard')
    return res.status(200).json({
      categories: (data.categories || []).map(toClientCategory),
      products: (data.products || []).map(toClientProduct),
      orders: (data.orders || []).map(toClientOrder),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
