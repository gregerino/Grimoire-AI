import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Button } from './Button'

interface Props {
  icon: ReactNode
  title: string
  description: string
  cta?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, cta, onAction }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy py-20 px-6"
    >
      <div className="mb-4 text-mist">{icon}</div>
      <h3 className="font-display text-lg text-parchment-dark mb-2 text-center">{title}</h3>
      <p className="font-body text-sm text-stone mb-6 text-center max-w-sm">{description}</p>
      {cta && onAction && (
        <Button variant="outline" onClick={onAction}>
          {cta}
        </Button>
      )}
    </motion.div>
  )
}
