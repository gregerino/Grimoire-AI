import { motion } from 'framer-motion'
import type { OnboardingStep } from '@/stores/onboardingStore'

interface Props {
  current: OnboardingStep
  total: number
}

export function StepIndicator({ current, total }: Props) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="relative h-1.5 flex-1 rounded-full bg-navy overflow-hidden">
          {i <= current && (
            <motion.div
              className="absolute inset-0 rounded-full bg-gold"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformOrigin: 'left' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
