'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import { createPost, uploadPostImage } from '@/app/actions/posts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import {
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_MIME_WHITELIST,
} from '@/lib/validation/posts'

export function CreatePostForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      const result = await createPost({ type: 'discussion', body: trimmed })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setBody('')
      router.refresh()
    })
  }

  function onPickImage() {
    fileRef.current?.click()
  }

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so picking the same file again re-triggers change.
    e.target.value = ''
    if (!file) return
    if (file.size > POST_IMAGE_MAX_BYTES) {
      setError('Image must be 5 MB or smaller.')
      return
    }
    if (!POST_IMAGE_MIME_WHITELIST.includes(file.type as (typeof POST_IMAGE_MIME_WHITELIST)[number])) {
      setError('Image must be JPG, PNG, WebP, or GIF.')
      return
    }
    setError(null)
    setIsUploading(true)
    const fd = new FormData()
    fd.set('image', file)
    startTransition(async () => {
      const result = await uploadPostImage(fd)
      setIsUploading(false)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      // Append the image as Markdown; it renders inline in the feed.
      setBody((prev) => `${prev}${prev && !prev.endsWith('\n') ? '\n\n' : ''}![image](${result.data.url})\n`)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind? Markdown supported."
        rows={3}
        maxLength={8000}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onImageChange}
        className="sr-only"
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPickImage}
          disabled={isPending}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {isUploading ? 'Uploading…' : 'Add image'}
        </Button>
        <Button type="submit" disabled={isPending || isUploading || !body.trim()}>
          {isPending && !isUploading ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </form>
  )
}
