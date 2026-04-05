import PropTypes from 'prop-types'

/**
 * Input component - ShadcnUI inspired input with Tailwind styling
 */
export function Input({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        px-3 py-2 rounded-lg border border-border bg-panel text-text
        placeholder-text-secondary transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  )
}

Input.propTypes = {
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
}
