import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-navy bg-dark-navy shadow-2xl">
        <div className="p-5">
          <div className="flex items-start gap-3">
            {danger && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blood/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-parchment">{title}</h3>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-navy px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-navy transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              danger
                ? 'bg-blood/80 text-parchment hover:bg-blood'
                : 'bg-gold text-dark-navy hover:bg-gold-light'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
