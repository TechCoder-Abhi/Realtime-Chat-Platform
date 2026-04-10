import PropTypes from 'prop-types'

/**
 * Badge component - ShadcnUI inspired badge/tag
 */
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-primary/20 text-primary border border-primary/40',
    secondary: 'bg-secondary/20 text-secondary border border-secondary/40',
    success: 'bg-green-500/20 text-green-600 border border-green-500/40',
    destructive: 'bg-red-500/20 text-red-600 border border-red-500/40',
    warning: 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/40',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'secondary', 'success', 'destructive', 'warning']),
  className: PropTypes.string,
}
