import { motion } from 'framer-motion'
import { Flame, Skull, Swords, Ghost } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CampaignSetting, Difficulty } from '@/stores/onboardingStore'

interface Props {
  setting: CampaignSetting | null
  difficulty: Difficulty
  campaignName: string
  onUpdate: (data: { setting?: CampaignSetting; difficulty?: Difficulty; campaignName?: string }) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

const settings: { id: CampaignSetting; label: string; description: string; icon: typeof Flame }[] = [
  {
    id: 'high-fantasy',
    label: 'High Fantasy',
    description: 'Episka äventyr med magi, drakar och legendariska hjältar.',
    icon: Flame,
  },
  {
    id: 'dark-fantasy',
    label: 'Dark Fantasy',
    description: 'En dyster värld där moralen är grå och hopp är sällsynt.',
    icon: Skull,
  },
  {
    id: 'sword-and-sorcery',
    label: 'Sword & Sorcery',
    description: 'Råa äventyr drivna av svärdsklang och farlig trolldom.',
    icon: Swords,
  },
  {
    id: 'horror',
    label: 'Horror',
    description: 'Skräckfylld stämning. Mörka hemligheter och okänd fara.',
    icon: Ghost,
  },
]

const difficulties: { id: Difficulty; label: string; description: string }[] = [
  { id: 'narrative', label: 'Berättande', description: 'Fokus på historia. Nådigt med regler.' },
  { id: 'normal', label: 'Normal', description: 'Balanserat äventyr med konsekvenser.' },
  { id: 'hardcore', label: 'Hardcore', description: 'Varje val har vikt. Döden är permanent.' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export function CampaignStep({ setting, difficulty, campaignName, onUpdate, onNext, onBack, onSkip }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-6 py-8"
    >
      <h2 className="font-display text-2xl font-bold text-parchment mb-2">
        Skapa din kampanj
      </h2>
      <p className="font-body text-stone mb-8">
        Välj den värld du vill utforska.
      </p>

      <div className="space-y-8">
        <Input
          label="Kampanjnamn"
          placeholder="The Curse of Strahd, Hembrygd..."
          value={campaignName}
          onChange={(e) => onUpdate({ campaignName: e.target.value })}
        />

        <div>
          <label className="block text-sm font-medium text-parchment-dark font-ui mb-3">
            Setting
          </label>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3"
          >
            {settings.map((s) => {
              const Icon = s.icon
              const selected = setting === s.id
              return (
                <motion.button
                  key={s.id}
                  variants={item}
                  type="button"
                  onClick={() => onUpdate({ setting: s.id })}
                  className={`
                    flex flex-col items-start gap-2 rounded-xl border p-4 text-left
                    transition-all duration-200 ease-smooth cursor-pointer
                    ${selected
                      ? 'border-gold/50 bg-gold/5 shadow-glow-gold'
                      : 'border-navy bg-dark-navy hover:border-mist'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${selected ? 'text-gold' : 'text-stone'}`} />
                    <span className={`font-display text-sm font-semibold ${selected ? 'text-parchment' : 'text-parchment-dark'}`}>
                      {s.label}
                    </span>
                  </div>
                  <span className="font-body text-xs text-stone leading-relaxed">
                    {s.description}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>
        </div>

        <div>
          <label className="block text-sm font-medium text-parchment-dark font-ui mb-3">
            Svårighetsgrad
          </label>
          <div className="flex gap-3">
            {difficulties.map((d) => {
              const selected = difficulty === d.id
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onUpdate({ difficulty: d.id })}
                  className={`
                    flex-1 rounded-lg border p-3 text-left
                    transition-all duration-200 ease-smooth cursor-pointer
                    ${selected
                      ? 'border-gold/50 bg-gold/5'
                      : 'border-navy bg-dark-navy hover:border-mist'
                    }
                  `}
                >
                  <span className={`block font-ui text-sm font-semibold ${selected ? 'text-parchment' : 'text-parchment-dark'}`}>
                    {d.label}
                  </span>
                  <span className="block font-body text-xs text-stone mt-0.5">{d.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Tillbaka
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onSkip} className="text-stone">
            Hoppa över
          </Button>
          <Button onClick={onNext} disabled={!setting}>
            Fortsätt
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
