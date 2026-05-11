import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const alertStyles = cva(
  'relative w-full rounded-md border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg+*]:pl-7',
  {
    variants: {
      tone: {
        info: 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100',
        warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
        error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
        success:
          'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
      },
    },
    defaultVariants: { tone: 'info' },
  },
)

export type AlertProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertStyles>

export function Alert({ className, tone, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertStyles({ tone }), className)} {...props} />
}
