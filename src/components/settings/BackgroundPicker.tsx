import { useState } from 'react'
import { ImageIcon, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useBackgroundStore, BACKGROUNDS } from '@/stores/backgroundStore'

export function BackgroundPicker() {
  const [open, setOpen] = useState(false)
  const { backgroundId, setBackground } = useBackgroundStore()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-stone hover:bg-navy hover:text-gold transition-colors focus-ring"
        aria-label="Byt bakgrundsbild"
      >
        <ImageIcon className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Bakgrundsbild" size="lg">
        <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {BACKGROUNDS.map((bg) => {
            const selected = backgroundId === bg.id
            return (
              <button
                key={bg.id}
                onClick={() => { setBackground(bg.id); setOpen(false) }}
                className={`
                  group relative overflow-hidden rounded-lg border-2 transition-all
                  ${selected ? 'border-gold shadow-glow-gold' : 'border-navy hover:border-mist'}
                `}
              >
                {bg.src ? (
                  <img
                    src={bg.src}
                    alt={bg.label}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-midnight">
                    <span className="text-xs text-stone">Ingen</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
                  <span className="font-ui text-[11px] text-parchment">{bg.label}</span>
                </div>
                {selected && (
                  <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold">
                    <Check className="h-3 w-3 text-dark-navy" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </Modal>
    </>
  )
}
