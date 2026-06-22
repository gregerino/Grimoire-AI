import { type ReactNode, type HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hoverable?: boolean
  glowing?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, hoverable, glowing, padding = 'md', className = '', ...rest }: Props) {
  return (
    <div
      className={`
        rounded-xl border border-navy bg-dark-navy
        transition-all duration-200 ease-smooth
        ${paddingStyles[padding]}
        ${hoverable ? 'hover:border-gold/30 hover:shadow-card-hover cursor-pointer' : ''}
        ${glowing ? 'shadow-glow-gold border-gold/20' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  )
}
