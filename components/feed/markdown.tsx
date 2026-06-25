import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { cn } from '@/lib/utils/cn'

export function Markdown({
  body,
  className,
}: {
  body: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-zinc-800 dark:text-zinc-200',
        '[&>p]:my-2 [&>h1]:mt-4 [&>h1]:text-xl [&>h2]:mt-4 [&>h2]:text-lg [&>ul]:my-2 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:my-2 [&>ol]:list-decimal [&>ol]:pl-6',
        '[&_a]:font-medium [&_a]:underline-offset-4 hover:[&_a]:underline',
        '[&_img]:my-2 [&_img]:max-h-96 [&_img]:w-auto [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-zinc-200 dark:[&_img]:border-zinc-800',
        '[&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs dark:[&_code]:bg-zinc-800',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {body}
      </ReactMarkdown>
    </div>
  )
}
