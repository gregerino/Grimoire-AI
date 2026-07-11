import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Scroll, Swords, BookOpen, Brain, Package, Map, Music, Mic, Search, X, ChevronDown } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

const sections = [
  {
    icon: Scroll,
    title: 'Kampanjer',
    description: 'Skapa en kampanj med setting och svårighetsgrad. Varje kampanj har sin egen värld, karaktär och historia.',
  },
  {
    icon: Swords,
    title: 'Sessioner',
    description: 'Starta en session för att spela. Skriv vad din karaktär gör så svarar AI-spelledaren med berättelsen. Avsluta sessionen när du vill — en dagbok skrivs automatiskt.',
  },
  {
    icon: BookOpen,
    title: 'Regelböcker (PDF)',
    description: 'Ladda upp regelböcker som PDF. AI:n använder dem som referens för regler, besvärjelser och monster under spelets gång.',
  },
  {
    icon: Brain,
    title: 'DM-minne',
    description: 'AI:n kommer ihåg viktiga händelser, NPC:er och beslut mellan sessioner. Du kan granska och redigera minnena.',
  },
  {
    icon: Package,
    title: 'Inventarier & Loot',
    description: 'Föremål och guld du hittar läggs automatiskt till i ditt inventarie. Hantera utrustning under kampanjfliken.',
  },
  {
    icon: Map,
    title: 'Platser & Rykte',
    description: 'Besökta platser sparas med beskrivningar. Ditt rykte hos olika fraktioner påverkar hur NPC:er bemöter dig.',
  },
  {
    icon: Music,
    title: 'Ljud & Musik',
    description: 'AI:n spelar automatiskt ambient-ljud och musik som passar scenen. Justera volymen i sidopanelen.',
  },
  {
    icon: Mic,
    title: 'Röststyrning',
    description: 'Aktivera text-till-tal för att höra berättelsen uppläst. Du kan också använda mikrofonen för att diktera dina handlingar.',
  },
]

function highlight(text: string, query: string): ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-gold/25 text-gold">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function HowToGuide({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [openTitles, setOpenTitles] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  const isSearching = query.trim().length > 0

  const filtered = useMemo(() => {
    if (!isSearching) return sections
    const q = query.trim().toLowerCase()
    return sections.filter((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
  }, [query, isSearching])

  const toggle = (title: string) => {
    setOpenTitles((prev) => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Hur man spelar" size="lg">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök i guiden..."
          className="w-full rounded-lg border border-navy bg-midnight pl-9 pr-9 py-2 text-xs text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors"
        />
        {isSearching && (
          <button
            onClick={() => { setQuery(''); searchRef.current?.focus() }}
            aria-label="Rensa sökning"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gold transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="py-6 text-center font-body text-xs text-stone">
            Inga träffar för &quot;{query}&quot;.
          </p>
        )}
        {filtered.map((section) => {
          const Icon = section.icon
          const isOpen = isSearching || openTitles.has(section.title)
          return (
            <div key={section.title} className="rounded-lg border border-navy bg-midnight/50 overflow-hidden">
              <button
                onClick={() => toggle(section.title)}
                className="flex w-full items-center gap-3 p-3 text-left focus-ring"
                aria-expanded={isOpen}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                  <Icon className="h-4 w-4 text-gold" />
                </div>
                <h3 className="font-ui text-sm font-semibold text-parchment flex-1">
                  {highlight(section.title, query)}
                </h3>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="font-body text-xs text-stone leading-relaxed px-3 pb-3 pl-14">
                      {highlight(section.description, query)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
