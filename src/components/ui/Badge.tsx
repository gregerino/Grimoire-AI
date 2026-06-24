import { type ReactNode } from 'react'

type Variant = 'default' | 'gold' | 'blood' | 'mystic' | 'success' | 'warning'
type Size = 'sm' | 'md'

interface Props {
  children: ReactNode
  variant?: Variant
  size?: Size
  dot?: boolean
  className?: string
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-navy text-stone',
  gold: 'bg-gold/15 text-gold-light',
  blood: 'bg-blood/15 text-blood-light',
  mystic: 'bg-mystic/15 text-mystic-light',
  success: 'bg-green-500/15 text-green-400',
  warning: 'bg-yellow-500/15 text-yellow-400',
}

const dotColors: Record<Variant, string> = {
  default: 'bg-stone',
  gold: 'bg-gold',
  blood: 'bg-blood-light',
  mystic: 'bg-mystic-light',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({ children, variant = 'default', size = 'md', dot, className = '' }: Props) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-ui font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />}
      {children}
    </span>
  )
}
