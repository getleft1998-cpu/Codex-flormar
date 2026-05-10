import { requireAdminAuth } from '../../lib/admin-auth'
import { callAdminRpc } from '../../lib/admin-db'
import { toClientOrder } from '../../lib/transformers'

export default async function handler(req, res) {
  if (!requireAdminAuth(req, res)) return

  // GET all orders
  if (req.method === 'GET') {
    try {
      const data = await callAdminRpc('admin_get_dashboard')
      return res.status(200).json({ orders: (data.orders || []).map(toClientOrder) })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  // PATCH update order status
  if (req.method === 'PATCH') {
    const { id, status, assigned_to } = req.body

    if (!id) return res.status(400).json({ error: 'Missing order id' })

    try {
      const order = await callAdminRpc('admin_update_order', {
        p_order_id: id,
        p_status: status || null,
        p_assigned_to: assigned_to === undefined ? null : assigned_to,
      })
      return res.status(200).json({ order })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  res.status(405).end()
}
