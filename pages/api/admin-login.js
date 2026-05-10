import { createAdminToken, verifyAdminPassword } from '../../lib/admin-auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body || {}

  if (!verifyAdminPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  return res.status(200).json({ token: createAdminToken() })
}
