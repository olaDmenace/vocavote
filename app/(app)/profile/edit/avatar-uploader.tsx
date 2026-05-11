'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadAvatar } from '@/app/actions/profile'
import { Avatar } from '@/components/profile/avatar'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { AVATAR_MAX_BYTES, AVATAR_MIME_WHITELIST } from '@/lib/validation/profile'
import type { Profile } from '@/lib/auth/guards'

export function AvatarUploader({ profile }: { profile: Profile }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  function onPick() {
    inputRef.current?.click()
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > AVATAR_MAX_BYTES) {
      setMessage({ tone: 'error', text: 'Avatar must be 2 MB or smaller.' })
      return
    }
    if (!AVATAR_MIME_WHITELIST.includes(file.type as (typeof AVATAR_MIME_WHITELIST)[number])) {
      setMessage({ tone: 'error', text: 'Avatar must be a JPG or PNG.' })
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
    setMessage(null)
    const fd = new FormData()
    fd.set('avatar', file)
    startTransition(async () => {
      const result = await uploadAvatar(fd)
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.error.message })
        return
      }
      setMessage({ tone: 'success', text: 'Avatar updated.' })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <Avatar fullName={profile.full_name} avatarPath={profile.avatar_path} size="xl" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={onChange}
        className="sr-only"
      />
      <Button type="button" variant="outline" onClick={onPick} disabled={isPending}>
        {isPending ? 'Uploading…' : 'Change avatar'}
      </Button>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
    </div>
  )
}
