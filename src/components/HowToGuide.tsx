import { Modal } from '@/components/ui/Modal'
import { Scroll, Swords, BookOpen, Brain, Package, Map, Music, Mic } from 'lucide-react'

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

export function HowToGuide({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Hur man spelar" size="lg">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div key={section.title} className="flex gap-3 rounded-lg border border-navy bg-midnight/50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                <Icon className="h-4 w-4 text-gold" />
              </div>
              <div>
                <h3 className="font-ui text-sm font-semibold text-parchment mb-0.5">{section.title}</h3>
                <p className="font-body text-xs text-stone leading-relaxed">{section.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
