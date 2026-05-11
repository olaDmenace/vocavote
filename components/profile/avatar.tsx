import { avatarUrl, initialsFor } from '@/lib/utils/avatar'
import { cn } from '@/lib/utils/cn'

type Props = {
  fullName: string
  avatarPath?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLS: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
}

export function Avatar({ fullName, avatarPath, size = 'md', className }: Props) {
  const url = avatarUrl(avatarPath)
  const initials = initialsFor(fullName)

  return (
    <span
      className={cn(
        'inline-grid place-items-center overflow-hidden rounded-full bg-zinc-200 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
        SIZE_CLS[size],
        className,
      )}
      aria-hidden="true"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span>{initials || '?'}</span>
      )}
    </span>
  )
}
