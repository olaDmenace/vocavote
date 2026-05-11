import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey || serviceRoleKey === 'PASTE_SERVICE_ROLE_KEY_HERE') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing. Paste it from the Supabase dashboard into .env.local.',
    )
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
