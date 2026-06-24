import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, icon, className = '', id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-parchment-dark font-ui">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" aria-hidden="true">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            className={`
              w-full rounded-lg border bg-midnight px-3 py-2.5 text-sm text-parchment font-ui
              placeholder:text-mist
              transition-colors duration-200 ease-smooth
              focus-ring
              ${icon ? 'pl-10' : ''}
              ${error
                ? 'border-blood focus:border-blood-light'
                : 'border-navy hover:border-mist focus:border-gold/50'
              }
              disabled:opacity-40 disabled:cursor-not-allowed
              ${className}
            `}
            {...rest}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs text-blood-light font-ui">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
