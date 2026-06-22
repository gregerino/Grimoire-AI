import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: ReactNode
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({ open, onClose, title, children, size = 'md', footer }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        className={`
          w-full ${sizeStyles[size]}
          rounded-xl border border-navy bg-dark-navy shadow-card
          animate-in fade-in zoom-in-95 duration-200
        `}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-navy px-5 py-4">
            <h2 className="text-lg font-display font-semibold text-parchment">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-stone hover:bg-navy hover:text-parchment transition-colors focus-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="p-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-3 border-t border-navy px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
