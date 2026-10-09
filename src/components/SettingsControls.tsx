import { type ReactNode } from 'react'

/** A titled card of related settings. */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="settings-group">
      {title && <h3 className="settings-group__title">{title}</h3>}
      {description && <p className="settings-group__description">{description}</p>}
      <div className="settings-group__card">{children}</div>
    </section>
  )
}

/** One line in a group: a label on the left, a control or value on the right. */
export function SettingRow({
  label,
  hint,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="setting-line">
      <div className="setting-line__text">
        <div className="setting-line__label">{label}</div>
        {hint && <div className="setting-line__hint">{hint}</div>}
      </div>
      {children && <div className="setting-line__control">{children}</div>}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__thumb" />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
