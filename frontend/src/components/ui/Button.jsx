import PropTypes from 'prop-types'

/**
 * Button component - ShadcnUI inspired button with Tailwind styling
 */
export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  const baseStyles = 'font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variants = {
    default: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-secondary text-text hover:bg-secondary/80 focus:ring-secondary',
    ghost: 'hover:bg-primary/10 text-text hover:text-primary focus:ring-primary',
    destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const finalClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={finalClassName}
      {...props}>
      {children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'secondary', 'ghost', 'destructive']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
}
