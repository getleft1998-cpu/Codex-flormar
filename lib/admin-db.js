import { getSupabasePublic } from './supabase'

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export async function callAdminRpc(name, args = {}) {
  const supabase = getSupabasePublic()
  const { data, error } = await supabase.rpc(name, {
    p_secret: requiredEnv('ADMIN_DB_SECRET'),
    ...args,
  })

  if (error) throw new Error(error.message)
  return data
}
