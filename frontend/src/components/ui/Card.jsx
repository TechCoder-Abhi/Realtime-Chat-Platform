import PropTypes from 'prop-types'

/**
 * Card component - ShadcnUI inspired card container
 */
export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-primary bg-panel p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

/**
 * Card Header
 */
export function CardHeader({ children, className = '' }) {
  return <div className={`mb-4 border-b border-primary pb-3 ${className}`}>{children}</div>
}

/**
 * Card Title
 */
export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-lg font-semibold text-text ${className}`}>{children}</h3>
}

/**
 * Card Description
 */
export function CardDescription({ children, className = '' }) {
  return <p className={`text-sm text-text-secondary ${className}`}>{children}</p>
}

/**
 * Card Content
 */
export function CardContent({ children, className = '' }) {
  return <div className={`space-y-3 ${className}`}>{children}</div>
}

/**
 * Card Footer
 */
export function CardFooter({ children, className = '' }) {
  return <div className={`border-t border-primary pt-3 mt-4 ${className}`}>{children}</div>
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

CardHeader.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

CardTitle.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

CardDescription.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

CardContent.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

CardFooter.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}
