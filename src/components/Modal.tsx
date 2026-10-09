import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  label: string
  /** A wider sheet, for forms. */
  wide?: boolean
  children: ReactNode
}

const EXIT_MS = 180

export function Modal({ open, onClose, label, wide, children }: ModalProps) {
  // Stay mounted briefly after `open` goes false so the exit can animate.
  const [mounted, setMounted] = useState(open)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const id = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(id)
  }, [open])

  // Read through a ref so a new onClose each render doesn't re-run the effect
  // below, which would pull focus out of whatever is being typed in.
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [open])

  if (!mounted) return null

  return (
    <div className={`modal${open ? '' : ' is-closing'}`} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={`modal__sheet glass${wide ? ' modal__sheet--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="icon-button modal__close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}
