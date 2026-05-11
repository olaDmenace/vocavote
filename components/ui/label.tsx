import { forwardRef, type LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none text-zinc-800 dark:text-zinc-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  )
})
