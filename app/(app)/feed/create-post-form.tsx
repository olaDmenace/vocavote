'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, X } from 'lucide-react'
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
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  const canPost = Boolean(body.trim() || images.length > 0)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canPost) return
    setError(null)
    // Attach uploaded images as Markdown at the end of the post body.
    const finalBody = [body.trim(), ...images.map((u) => `![image](${u})`)]
      .filter(Boolean)
      .join('\n\n')
    startTransition(async () => {
      const result = await createPost({ type: 'discussion', body: finalBody })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setBody('')
      setImages([])
      router.refresh()
    })
  }

  function onPickImage() {
    fileRef.current?.click()
  }

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
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
      setImages((prev) => [...prev, result.data.url])
    })
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url))
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

      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="upload preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="Remove image"
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-zinc-900/70 text-white hover:bg-zinc-900"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

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
        <Button type="submit" disabled={isPending || isUploading || !canPost}>
          {isPending && !isUploading ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </form>
  )
}
