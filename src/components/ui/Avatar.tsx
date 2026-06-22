type Size = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  src?: string | null
  alt?: string
  fallback?: string
  size?: Size
  ring?: boolean
  className?: string
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export function Avatar({ src, alt = '', fallback, size = 'md', ring, className = '' }: Props) {
  const initials = fallback
    ? fallback.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div
      className={`
        relative shrink-0 rounded-full overflow-hidden
        ${sizeStyles[size]}
        ${ring ? 'ring-2 ring-gold/40' : ''}
        ${className}
      `}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-dusk font-display font-semibold text-gold-light">
          {initials}
        </div>
      )}
    </div>
  )
}
