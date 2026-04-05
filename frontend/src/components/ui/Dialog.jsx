import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'

/**
 * Dialog component - ShadcnUI inspired modal dialog
 */
export function Dialog({ open = false, onClose, children, title = '' }) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-panel-in">
      <div className="w-full max-w-md rounded-2xl bg-panel border border-primary p-6 shadow-2xl animate-slide-right">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text transition-colors text-xl">
              ✕
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>,
    document.body
  )
}

Dialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  children: PropTypes.node,
  title: PropTypes.string,
}

/**
 * Dialog Footer - Container for dialog actions
 */
export function DialogFooter({ children }) {
  return <div className="flex justify-end gap-2 mt-4">{children}</div>
}

DialogFooter.propTypes = {
  children: PropTypes.node,
}

/**
 * Dialog Header - Container for dialog title and close button
 */
export function DialogHeader({ children }) {
  return <div className="mb-4">{children}</div>
}

DialogHeader.propTypes = {
  children: PropTypes.node,
}

/**
 * Dialog Content - Main content area
 */
export function DialogContent({ children }) {
  return <div className="mb-4">{children}</div>
}

DialogContent.propTypes = {
  children: PropTypes.node,
}
