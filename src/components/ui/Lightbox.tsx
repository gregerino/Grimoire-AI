import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  src: string
  alt: string
  label?: string
  onClose: () => void
}

export function Lightbox({ src, alt, label, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 rounded-lg bg-black/60 p-2 text-gray-300 hover:text-white transition-colors"
        onClick={onClose}
        aria-label="Stäng"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-xl border border-navy object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {label && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-gray-400 pointer-events-none">
          {label}
        </p>
      )}
    </div>,
    document.body,
  )
}
