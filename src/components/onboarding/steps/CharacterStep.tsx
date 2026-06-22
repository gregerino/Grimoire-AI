import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, UserCircle, Shield, Heart, Swords } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  onFinish: () => void
  onBack: () => void
  onSkip: () => void
}

interface CharacterPreview {
  name: string
  class: string
  level: number
  race: string
}

export function CharacterStep({ onFinish, onBack, onSkip }: Props) {
  const [synced, setSynced] = useState<CharacterPreview | null>(null)
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSynced({
      name: 'Thorn Blackwood',
      class: 'Ranger',
      level: 5,
      race: 'Half-Elf',
    })
    setSyncing(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-6 py-8"
    >
      <h2 className="font-display text-2xl font-bold text-parchment mb-2">
        Din karaktär
      </h2>
      <p className="font-body text-stone mb-8">
        Koppla din karaktär från D&D Beyond eller skapa en direkt i kampanjen.
      </p>

      {!synced ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="
              w-full flex items-center gap-4 rounded-xl border border-navy bg-dark-navy p-5
              hover:border-mist transition-all duration-200 cursor-pointer
              disabled:opacity-60 disabled:cursor-wait
            "
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blood/20 text-blood-light">
              <ExternalLink className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-ui text-sm font-semibold text-parchment">
                {syncing ? 'Syncar...' : 'Synca från D&D Beyond'}
              </p>
              <p className="font-body text-xs text-stone">
                Importera karaktärsdata automatiskt
              </p>
            </div>
            {syncing && (
              <div className="ml-auto h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            )}
          </button>

          <div className="flex items-center gap-4 text-stone">
            <div className="h-px flex-1 bg-navy" />
            <span className="font-ui text-xs">eller</span>
            <div className="h-px flex-1 bg-navy" />
          </div>

          <p className="font-body text-sm text-stone text-center">
            Du kan skapa din karaktär manuellt när du startar kampanjen.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-gold/30 bg-gold/5 p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-dark-navy">
              <UserCircle className="h-8 w-8 text-gold" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-parchment">{synced.name}</h3>
              <p className="font-body text-sm text-parchment-dark">{synced.race} {synced.class}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-dark-navy/60 p-3">
              <Shield className="h-4 w-4 text-gold-dim" />
              <div>
                <p className="font-ui text-[10px] text-stone uppercase tracking-wider">Klass</p>
                <p className="font-ui text-sm text-parchment">{synced.class}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-dark-navy/60 p-3">
              <Heart className="h-4 w-4 text-blood-light" />
              <div>
                <p className="font-ui text-[10px] text-stone uppercase tracking-wider">Nivå</p>
                <p className="font-ui text-sm text-parchment">{synced.level}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-dark-navy/60 p-3">
              <Swords className="h-4 w-4 text-mystic-light" />
              <div>
                <p className="font-ui text-[10px] text-stone uppercase tracking-wider">Ras</p>
                <p className="font-ui text-sm text-parchment">{synced.race}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Tillbaka
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onSkip} className="text-stone">
            Hoppa över
          </Button>
          <Button onClick={onFinish}>
            {synced ? 'Starta äventyret' : 'Fortsätt utan karaktär'}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
