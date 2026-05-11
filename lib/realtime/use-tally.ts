'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

export type TallyRow = {
  position_id: number
  position_title: string
  candidate_id: number
  candidate_name: string
  vote_count: number
}

export function useTally(electionId: number, initialRows: TallyRow[]) {
  const [rows, setRows] = useState<TallyRow[]>(initialRows)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()

    async function refetch() {
      const { data, error } = await supabase.rpc('tally_for_election', {
        p_election_id: electionId,
      })
      if (!error && data) {
        startTransition(() => setRows(data as TallyRow[]))
      }
    }

    const channel = supabase
      .channel(`tally-election-${electionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `election_id=eq.${electionId}`,
        },
        () => {
          refetch()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [electionId])

  return rows
}
