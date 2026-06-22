import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gauge, Shield, User, Swords, ScrollText, Package,
  FileText, History, Volume2, Music, MapPin, Flag,
  Brain, StickyNote, X,
} from 'lucide-react'
import { useCombatStore } from '@/stores/combatStore'

export type SidebarPanel =
  | 'gamestate' | 'history' | 'npcs' | 'quests'
  | 'inventory' | 'library' | 'character' | 'combat'
  | 'speech' | 'audio' | 'locations' | 'reputation'
  | 'memory' | 'notes'
  | null

const panelTabs = [
  { id: 'character' as const, icon: User, label: 'Character' },
  { id: 'inventory' as const, icon: Package, label: 'Inventory' },
  { id: 'quests' as const, icon: ScrollText, label: 'Quests' },
  { id: 'npcs' as const, icon: Swords, label: 'NPCs' },
  { id: 'combat' as const, icon: Shield, label: 'Combat' },
  { id: 'gamestate' as const, icon: Gauge, label: 'Game State' },
  { id: 'locations' as const, icon: MapPin, label: 'Locations' },
  { id: 'reputation' as const, icon: Flag, label: 'Factions' },
  { id: 'notes' as const, icon: StickyNote, label: 'Notes' },
  { id: 'memory' as const, icon: Brain, label: 'Memory' },
  { id: 'library' as const, icon: FileText, label: 'PDFs' },
  { id: 'history' as const, icon: History, label: 'Sessions' },
  { id: 'speech' as const, icon: Volume2, label: 'Röst' },
  { id: 'audio' as const, icon: Music, label: 'Ljud' },
]

interface Props {
  activePanel: SidebarPanel
  onTogglePanel: (panel: SidebarPanel) => void
  children: ReactNode
}

export function GameSidebar({ activePanel, onTogglePanel, children }: Props) {
  return (
    <AnimatePresence>
      {activePanel && (
        <motion.aside
          className="flex w-80 shrink-0 flex-col border-r border-navy/50 bg-dark-navy/40 backdrop-blur-sm"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Tab bar */}
          <div className="flex items-center border-b border-navy/50">
            <div className="flex flex-1 overflow-x-auto scrollbar-hide">
              {panelTabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activePanel === tab.id}
                  onToggle={() => onTogglePanel(tab.id)}
                />
              ))}
            </div>
            <button
              onClick={() => onTogglePanel(null)}
              className="shrink-0 p-2 text-mist transition-colors hover:text-parchment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function TabButton({
  tab,
  isActive,
  onToggle,
}: {
  tab: { id: string; icon: React.ComponentType<{ className?: string }>; label: string }
  isActive: boolean
  onToggle: () => void
}) {
  const inCombat = useCombatStore((s) => s.inCombat)
  const showDot = tab.id === 'combat' && inCombat
  const Icon = tab.icon

  return (
    <button
      onClick={onToggle}
      className={`relative flex shrink-0 items-center justify-center p-2.5 transition-colors ${
        isActive
          ? 'border-b-2 border-gold text-gold'
          : showDot
            ? 'text-red-400'
            : 'text-mist hover:text-stone'
      }`}
      title={tab.label}
    >
      <Icon className="h-4 w-4" />
      {showDot && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
      )}
    </button>
  )
}

export { panelTabs }
