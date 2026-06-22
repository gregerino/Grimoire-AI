import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gold text-dark-navy font-semibold hover:bg-gold-light active:bg-gold-dim shadow-glow-gold/20',
  secondary:
    'bg-navy text-parchment hover:bg-dusk active:bg-shadow',
  ghost:
    'bg-transparent text-stone hover:bg-navy hover:text-parchment',
  danger:
    'bg-blood text-parchment font-semibold hover:bg-blood-light shadow-glow-blood/20',
  outline:
    'bg-transparent text-gold ring-1 ring-gold/30 hover:bg-gold/10 hover:ring-gold/50',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', loading, icon, children, disabled, className = '', ...rest }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-ui
          transition-all duration-200 ease-smooth
          focus-ring select-none
          disabled:opacity-40 disabled:pointer-events-none
          active:scale-[0.97]
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...rest}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
