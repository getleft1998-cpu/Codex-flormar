import { createClient } from '@supabase/supabase-js'

let publicClient
let adminClient

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function getSupabasePublic() {
  if (!publicClient) {
    publicClient = createClient(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    )
  }

  return publicClient
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return adminClient
}
