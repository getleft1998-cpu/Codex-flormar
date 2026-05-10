import { requireAdminAuth } from '../../lib/admin-auth'
import { getSupabaseAdmin } from '../../lib/supabase'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
}

function safeFileName(fileName) {
  return String(fileName || 'product-image')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default async function handler(req, res) {
  if (!requireAdminAuth(req, res)) return
  if (req.method !== 'POST') return res.status(405).end()

  const { fileName, contentType, data } = req.body || {}
  const base64 = String(data || '').replace(/^data:[^;]+;base64,/, '')

  if (!base64 || !String(contentType || '').startsWith('image/')) {
    return res.status(400).json({ error: 'Invalid image upload' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const buffer = Buffer.from(base64, 'base64')
    const path = `products/${Date.now()}-${safeFileName(fileName)}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, buffer, {
        contentType,
        upsert: false,
      })

    if (error) throw new Error(error.message)

    const { data: publicData } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)

    return res.status(200).json({ url: publicData.publicUrl, path })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
