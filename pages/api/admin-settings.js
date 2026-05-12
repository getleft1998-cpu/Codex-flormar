import { requireAdminAuth } from '../../lib/admin-auth'
import { callAdminRpc } from '../../lib/admin-db'

export default async function handler(req, res) {
  if (!requireAdminAuth(req, res)) return

  try {
    if (req.method === 'GET') {
      const settings = await callAdminRpc('admin_get_settings')
      return res.status(200).json({ settings })
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const settings = await callAdminRpc('admin_update_settings', {
        p_settings: req.body?.settings || req.body || {},
      })
      return res.status(200).json({ settings })
    }

    return res.status(405).end()
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
