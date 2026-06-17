import { Skull, ShieldCheck } from 'lucide-react'
import type { DeathSaves } from '@/types/combat'

interface Props {
  saves: DeathSaves
}

export function DeathSaveTracker({ saves }: Props) {
  const isStabilized = saves.successes >= 3
  const isDead = saves.failures >= 3

  return (
    <div className="rounded-xl border border-navy bg-dark-navy p-3">
      <div className="mb-2 flex items-center gap-2">
        <Skull className="h-4 w-4 text-red-400" />
        <span className="text-xs font-medium text-gray-400">Death Saving Throws</span>
      </div>

      {isStabilized ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-green-400" />
          <span className="text-sm font-bold text-green-400">Stabilized</span>
        </div>
      ) : isDead ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2">
          <Skull className="h-4 w-4 text-red-400" />
          <span className="text-sm font-bold text-red-400">Dead</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-14 text-[10px] uppercase tracking-wider text-gray-600">
              Success
            </span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
                    i < saves.successes
                      ? 'border-green-400 bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)]'
                      : 'border-gray-600 bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-14 text-[10px] uppercase tracking-wider text-gray-600">
              Failure
            </span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
                    i < saves.failures
                      ? 'border-red-400 bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.4)]'
                      : 'border-gray-600 bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
