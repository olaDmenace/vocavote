export default function CandidatesLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      {[0, 1].map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <div className="h-5 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
            <div className="mb-4 h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((c) => (
                <div
                  key={c}
                  className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
