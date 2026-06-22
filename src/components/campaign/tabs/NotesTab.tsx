import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import { supabase } from '@/lib/supabase'

interface NotesTabProps {
  campaignId: string
  compact?: boolean
}

export function NotesTab({ campaignId, compact }: NotesTabProps) {
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef('')
  const contentRef = useRef('')

  const persist = useCallback(async (html: string) => {
    if (html === lastSavedRef.current) return
    setSaving(true)
    await supabase
      .from('campaigns')
      .update({ player_notes: html, updated_at: new Date().toISOString() })
      .eq('id', campaignId)
    lastSavedRef.current = html
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [campaignId])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Write your notes here — NPC names, clues, plans, session recaps...',
      }),
      Highlight.configure({ multicolor: true }),
      Underline,
    ],
    editorProps: {
      attributes: {
        class: 'prose-notes outline-none min-h-[300px] px-4 py-3',
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
      contentRef.current = html
      setSaved(false)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => persist(html), 1000)
    },
  })

  useEffect(() => {
    supabase
      .from('campaigns')
      .select('player_notes')
      .eq('id', campaignId)
      .single()
      .then(({ data }) => {
        const text = (data?.player_notes as string) ?? ''
        lastSavedRef.current = text
        contentRef.current = text
        if (editor && text) {
          editor.commands.setContent(text)
        }
        setLoaded(true)
      })
  }, [campaignId, editor])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (contentRef.current !== lastSavedRef.current) {
        supabase
          .from('campaigns')
          .update({ player_notes: contentRef.current, updated_at: new Date().toISOString() })
          .eq('id', campaignId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  if (!loaded || !editor) return null

  return (
    <div className={compact ? 'flex h-full flex-col' : 'space-y-3'}>
      <div className="flex items-center justify-between">
        <h2 className={compact ? 'text-sm font-semibold text-parchment' : 'text-lg font-semibold text-parchment font-display'}>
          Notebook
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

      {/* Toolbar */}
      <NotesToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 rounded-lg border border-navy bg-midnight overflow-y-auto transition-colors focus-within:border-gold/40 focus-within:ring-1 focus-within:ring-gold/20">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function NotesToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const btn = (active: boolean) =>
    `rounded px-2 py-1 text-xs transition-colors ${
      active ? 'bg-gold/20 text-gold' : 'text-gray-500 hover:bg-navy hover:text-gray-300'
    }`

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-navy bg-dark-navy/50 p-1">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold">
        <strong>B</strong>
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic">
        <em>I</em>
      </button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Underline">
        <span className="underline">U</span>
      </button>
      <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={btn(editor.isActive('highlight'))} title="Highlight">
        <span className="bg-yellow-400/30 px-0.5 rounded">H</span>
      </button>

      <div className="mx-1 h-4 w-px bg-navy" />

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} title="Heading">
        H2
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))} title="Subheading">
        H3
      </button>

      <div className="mx-1 h-4 w-px bg-navy" />

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Bullet list">
        •
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Numbered list">
        1.
      </button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Quote">
        &ldquo;
      </button>

      <div className="mx-1 h-4 w-px bg-navy" />

      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="Divider">
        —
      </button>
    </div>
  )
}
