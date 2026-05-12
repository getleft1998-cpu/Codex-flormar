import { requireAdminAuth } from '../../lib/admin-auth'
import { callAdminRpc } from '../../lib/admin-db'
import { toClientCategory } from '../../lib/transformers'

export default async function handler(req, res) {
  if (!requireAdminAuth(req, res)) return

  try {
    if (req.method === 'POST' || req.method === 'PUT') {
      const category = await callAdminRpc('admin_upsert_category', {
        p_category: req.body || {},
      })
      return res.status(200).json({ category: toClientCategory(category) })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id
      if (!id) return res.status(400).json({ error: 'Missing category id' })

      const category = await callAdminRpc('admin_delete_category', {
        p_category_id: id,
      })
      return res.status(200).json({ category: toClientCategory(category) })
    }

    return res.status(405).end()
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
