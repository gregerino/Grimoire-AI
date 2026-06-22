import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  onNext: () => void
}

export function WelcomeStep({ onNext }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="mb-8"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gold/30 bg-gold/5 shadow-glow-gold">
          <Sparkles className="h-10 w-10 text-gold" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="font-display text-4xl font-bold text-parchment mb-4"
      >
        Välkommen, äventyrare
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="font-body text-xl text-parchment-dark mb-3 max-w-md"
      >
        Din saga börjar här.
      </motion.p>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.5 }}
        className="font-body text-base text-stone mb-12 max-w-lg leading-relaxed"
      >
        Grimoire är din AI-drivna spelledare för solo-rollspel.
        Skapa en kampanj, ladda dina regelböcker och låt historien ta form
        — med varje val du gör.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        <Button size="lg" onClick={onNext} className="px-10 text-base">
          Börja mitt äventyr
        </Button>
      </motion.div>
    </motion.div>
  )
}
