import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  locationName?: string
  timeOfDay?: string
  timeIcon?: string
  day?: number
}

const ambientGradients: Record<string, string> = {
  dawn: 'from-amber-900/40 via-rose-900/30 to-indigo-900/50',
  morning: 'from-sky-900/30 via-amber-900/20 to-blue-900/40',
  afternoon: 'from-amber-800/30 via-orange-900/20 to-blue-900/30',
  evening: 'from-orange-900/40 via-purple-900/30 to-indigo-900/50',
  night: 'from-indigo-950/60 via-slate-900/40 to-purple-950/50',
  midnight: 'from-slate-950/70 via-indigo-950/50 to-black/60',
}

export function LocationHeader({ locationName, timeOfDay = 'morning', timeIcon, day }: Props) {
  const gradient = ambientGradients[timeOfDay] || ambientGradients.morning

  return (
    <div className="relative h-[200px] w-full overflow-hidden">
      {/* Ambient gradient background */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
        key={timeOfDay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* Atmospheric particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-gold/20"
            style={{
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 13.7) % 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: 4 + (i % 3) * 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-midnight/30 via-transparent to-midnight" />

      {/* Location info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={locationName}
          className="absolute inset-x-0 bottom-0 px-8 pb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.6 }}
        >
          {locationName && (
            <h2 className="font-display text-2xl font-bold tracking-wide text-parchment drop-shadow-lg">
              {locationName}
            </h2>
          )}
          <div className="mt-1 flex items-center gap-3 text-sm text-parchment/60">
            {timeIcon && <span>{timeIcon}</span>}
            {day != null && <span className="font-ui text-xs">Day {day}</span>}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
