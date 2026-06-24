import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, className = '', id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-parchment-dark font-ui">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`
            w-full rounded-lg border bg-midnight px-3 py-2.5 text-sm text-parchment font-ui
            placeholder:text-mist
            transition-colors duration-200 ease-smooth
            focus-ring resize-none
            ${error
              ? 'border-blood focus:border-blood-light'
              : 'border-navy hover:border-mist focus:border-gold/50'
            }
            disabled:opacity-40 disabled:cursor-not-allowed
            ${className}
          `}
          {...rest}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-blood-light font-ui">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
