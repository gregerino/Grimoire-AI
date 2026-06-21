import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface NotesTabProps {
  campaignId: string
  compact?: boolean
}

export function NotesTab({ campaignId, compact }: NotesTabProps) {
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef('')

  useEffect(() => {
    supabase
      .from('campaigns')
      .select('player_notes')
      .eq('id', campaignId)
      .single()
      .then(({ data }) => {
        const text = (data?.player_notes as string) ?? ''
        setNotes(text)
        lastSavedRef.current = text
        setLoaded(true)
      })
  }, [campaignId])

  const persist = useCallback(async (text: string) => {
    if (text === lastSavedRef.current) return
    setSaving(true)
    await supabase
      .from('campaigns')
      .update({ player_notes: text, updated_at: new Date().toISOString() })
      .eq('id', campaignId)
    lastSavedRef.current = text
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [campaignId])

  const handleChange = (text: string) => {
    setNotes(text)
    setSaved(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => persist(text), 1000)
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (notes !== lastSavedRef.current) {
        supabase
          .from('campaigns')
          .update({ player_notes: notes, updated_at: new Date().toISOString() })
          .eq('id', campaignId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, campaignId])

  if (!loaded) return null

  return (
    <div className={compact ? 'flex h-full flex-col' : 'space-y-3'}>
      <div className="flex items-center justify-between">
        <h2 className={compact ? 'text-sm font-semibold text-parchment' : 'text-lg font-semibold text-parchment'}>
          Notes
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {saving && (
            <>
              <Save className="h-3 w-3 animate-pulse" />
              <span>Saving...</span>
            </>
          )}
          {saved && (
            <>
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-green-400">Saved</span>
            </>
          )}
        </div>
      </div>
      <textarea
        className="w-full flex-1 resize-none rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors"
        rows={compact ? undefined : 16}
        placeholder="Write your notes here — NPC names, clues, plans, session recaps...&#10;&#10;Notes are saved automatically."
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  )
}
