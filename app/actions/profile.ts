'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_WHITELIST,
  updateProfileSchema,
} from '@/lib/validation/profile'
import { ok, err, type ActionResult } from '@/types/domain'

export async function updateProfile(
  input: z.input<typeof updateProfileSchema>,
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return err('invalid_input', parsed.error.issues[0]?.message ?? 'Check your inputs.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      bio: parsed.data.bio ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return err('unknown', error.message)

  revalidatePath('/profile/edit')
  revalidatePath(`/profile/${user.id}`)
  return ok(undefined)
}

export async function uploadAvatar(
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  const file = formData.get('avatar')
  if (!(file instanceof File)) return err('invalid_input', 'No file provided.')
  if (file.size === 0) return err('invalid_input', 'Pick an image first.')
  if (file.size > AVATAR_MAX_BYTES) {
    return err('invalid_input', 'Avatar must be 2 MB or smaller.')
  }
  if (!AVATAR_MIME_WHITELIST.includes(file.type as (typeof AVATAR_MIME_WHITELIST)[number])) {
    return err('invalid_input', 'Avatar must be a JPG or PNG.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  // Server-side regenerated path — clients can't pick their own.
  const path = `${user.id}/avatar-${Date.now()}.${ext}`

  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    })
  if (uploadError) return err('unknown', uploadError.message)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_path: path, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (updateError) return err('unknown', updateError.message)

  revalidatePath('/profile/edit')
  revalidatePath(`/profile/${user.id}`)
  revalidatePath('/feed')
  return ok({ path })
}
