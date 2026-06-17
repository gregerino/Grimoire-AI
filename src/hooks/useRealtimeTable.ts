import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface Options<T> {
  table: string
  campaignId: string
  orderBy?: keyof T & string
  ascending?: boolean
}

export function useRealtimeTable<T extends { id: string }>({ table, campaignId, orderBy = 'created_at' as keyof T & string, ascending = false }: Options<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('campaign_id', campaignId)
      .order(orderBy, { ascending })
    if (data) setRows(data as T[])
    setLoading(false)
  }, [table, campaignId, orderBy, ascending])

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel(`${table}:${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `campaign_id=eq.${campaignId}` },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (payload.eventType === 'INSERT') {
            setRows((prev) => ascending ? [...prev, payload.new as T] : [payload.new as T, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setRows((prev) => prev.map((r) => (r.id === (payload.new as T).id ? payload.new as T : r)))
          } else if (payload.eventType === 'DELETE') {
            setRows((prev) => prev.filter((r) => r.id !== (payload.old as { id: string }).id))
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [table, campaignId, fetchAll, ascending])

  return { rows, setRows, loading, refetch: fetchAll }
}
