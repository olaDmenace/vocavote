import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/**
 * Build a public URL for an avatar path stored in the `avatars` bucket.
 * Falls back to a deterministic initials block when no path is set.
 */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (!supabaseUrl) return null
  // Public bucket — no need for createSignedUrl.
  return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`
}

export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

// Discard the older client import the runtime tree-shaker would otherwise pull.
// (We only export pure functions here.)
void createClient
