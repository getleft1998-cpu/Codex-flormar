import { requireAdminAuth } from '../../lib/admin-auth'
import { callAdminRpc } from '../../lib/admin-db'
import { toClientProduct } from '../../lib/transformers'

export default async function handler(req, res) {
  if (!requireAdminAuth(req, res)) return

  try {
    if (req.method === 'POST' || req.method === 'PUT') {
      const product = await callAdminRpc('admin_upsert_product', {
        p_product: req.body || {},
      })
      return res.status(200).json({ product: toClientProduct(product) })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id
      if (!id) return res.status(400).json({ error: 'Missing product id' })

      const product = await callAdminRpc('admin_delete_product', {
        p_product_id: Number(id),
      })
      return res.status(200).json({ product: toClientProduct(product) })
    }

    return res.status(405).end()
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
