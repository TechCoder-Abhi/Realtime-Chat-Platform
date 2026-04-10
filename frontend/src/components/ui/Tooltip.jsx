import { useState } from 'react'
import PropTypes from 'prop-types'

/**
 * Tooltip component - ShadcnUI inspired tooltip
 */
export function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-block">
        {children}
      </div>

      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none z-50 animate-panel-in`}>
          {content}
          <div
            className={`absolute ${
              position === 'top'
                ? 'top-full border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900'
                : position === 'bottom'
                  ? 'bottom-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900'
                  : position === 'left'
                    ? 'left-full border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-slate-900'
                    : 'right-full border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-slate-900'
            }`}
          />
        </div>
      )}
    </div>
  )
}

Tooltip.propTypes = {
  children: PropTypes.node,
  content: PropTypes.node,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
}
