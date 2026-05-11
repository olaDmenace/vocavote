'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPost, updateManifesto } from '@/app/actions/posts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

type Props = {
  candidateId: number
  existingPostId: number | null
  initialTitle: string
  initialBody: string
}

export function ManifestoEditor({
  candidateId,
  existingPostId,
  initialTitle,
  initialBody,
}: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = existingPostId
        ? await updateManifesto({ postId: existingPostId, title, body })
        : await createPost({ type: 'manifesto', title, body, candidateId })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">Manifesto saved.</Alert> : null}

      <Field>
        <Label htmlFor="manifesto-title">Title</Label>
        <Input
          id="manifesto-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A united OAU"
          maxLength={200}
        />
      </Field>

      <Field>
        <Label htmlFor="manifesto-body">Manifesto</Label>
        <Textarea
          id="manifesto-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          maxLength={8000}
          placeholder="What will you do? Why should students trust you?"
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !title.trim() || !body.trim()}>
          {isPending ? 'Saving…' : existingPostId ? 'Update manifesto' : 'Publish manifesto'}
        </Button>
      </div>
    </form>
  )
}
