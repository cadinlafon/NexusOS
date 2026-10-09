import { useEffect, useReducer, useRef, type KeyboardEvent } from 'react'

type Operator = '+' | '−' | '×' | '÷'

interface CalcState {
  display: string
  /** Left-hand value waiting for the next operand. */
  stored: number | null
  operator: Operator | null
  /** The next digit starts a new number instead of extending the display. */
  fresh: boolean
  error: boolean
}

type CalcAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: Operator }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'negate' }
  | { type: 'percent' }
  | { type: 'backspace' }

const initial: CalcState = { display: '0', stored: null, operator: null, fresh: true, error: false }

const MAX_DIGITS = 12

function compute(a: number, b: number, operator: Operator): number | null {
  switch (operator) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? null : a / b
  }
}

/** Trim floating-point noise (0.1 + 0.2) and keep long results on the display. */
function format(value: number): string {
  const rounded = parseFloat(value.toPrecision(MAX_DIGITS))
  const text = String(rounded)
  return text.length > MAX_DIGITS + 1 ? rounded.toExponential(6) : text
}

const failed: CalcState = { ...initial, display: 'Can’t divide by 0', error: true }

function reducer(state: CalcState, action: CalcAction): CalcState {
  if (action.type === 'clear') return initial
  // After an error, any key starts over.
  if (state.error) state = initial

  const current = parseFloat(state.display)

  switch (action.type) {
    case 'digit':
      if (state.fresh) return { ...state, display: action.digit, fresh: false }
      if (state.display.replace(/[-.]/g, '').length >= MAX_DIGITS) return state
      return { ...state, display: state.display === '0' ? action.digit : state.display + action.digit }

    case 'decimal':
      if (state.fresh) return { ...state, display: '0.', fresh: false }
      return state.display.includes('.') ? state : { ...state, display: state.display + '.' }

    case 'operator': {
      // Chain: "2 + 3 ×" evaluates 2 + 3 before storing ×.
      if (state.operator && state.stored !== null && !state.fresh) {
        const result = compute(state.stored, current, state.operator)
        if (result === null) return failed
        return { display: format(result), stored: result, operator: action.operator, fresh: true, error: false }
      }
      return { ...state, stored: current, operator: action.operator, fresh: true }
    }

    case 'equals': {
      if (!state.operator || state.stored === null) return { ...state, fresh: true }
      const result = compute(state.stored, current, state.operator)
      if (result === null) return failed
      return { ...initial, display: format(result) }
    }

    case 'negate':
      return current === 0 ? state : { ...state, display: format(-current) }

    case 'percent':
      return { ...state, display: format(current / 100) }

    case 'backspace':
      if (state.fresh) return state
      return { ...state, display: state.display.length > 1 ? state.display.slice(0, -1) : '0' }
  }
}

interface Key {
  label: string
  action: CalcAction
  variant?: 'function' | 'operator' | 'equals'
  wide?: boolean
}

const digit = (d: string): Key => ({ label: d, action: { type: 'digit', digit: d } })
const op = (operator: Operator): Key => ({
  label: operator,
  action: { type: 'operator', operator },
  variant: 'operator',
})

const keys: Key[] = [
  { label: 'C', action: { type: 'clear' }, variant: 'function' },
  { label: '±', action: { type: 'negate' }, variant: 'function' },
  { label: '%', action: { type: 'percent' }, variant: 'function' },
  op('÷'),
  digit('7'), digit('8'), digit('9'), op('×'),
  digit('4'), digit('5'), digit('6'), op('−'),
  digit('1'), digit('2'), digit('3'), op('+'),
  { ...digit('0'), wide: true },
  { label: '.', action: { type: 'decimal' } },
  { label: '=', action: { type: 'equals' }, variant: 'equals' },
]

const keyboardOperators: Record<string, Operator> = { '+': '+', '-': '−', '*': '×', x: '×', '/': '÷' }

export function CalculatorApp() {
  const [state, dispatch] = useReducer(reducer, initial)
  const rootRef = useRef<HTMLDivElement>(null)

  // Take focus on launch so the keyboard works straight away.
  useEffect(() => rootRef.current?.focus(), [])

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const { key } = event
    let action: CalcAction | null = null
    if (/^\d$/.test(key)) action = { type: 'digit', digit: key }
    else if (key === '.' || key === ',') action = { type: 'decimal' }
    else if (key in keyboardOperators) action = { type: 'operator', operator: keyboardOperators[key] }
    else if (key === 'Enter' || key === '=') action = { type: 'equals' }
    else if (key === 'Backspace') action = { type: 'backspace' }
    else if (key === 'Escape' || key.toLowerCase() === 'c') action = { type: 'clear' }
    else if (key === '%') action = { type: 'percent' }
    if (!action) return
    event.preventDefault()
    dispatch(action)
  }

  const pending =
    state.operator && state.stored !== null ? `${format(state.stored)} ${state.operator}` : ''

  return (
    <div className="app calc" ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="calc__display" aria-live="polite">
        <div className="calc__pending">{pending}</div>
        <div className={`calc__value${state.display.length > 9 ? ' is-long' : ''}`}>
          {state.display}
        </div>
      </div>

      <div className="calc__keys">
        {keys.map((key) => (
          <button
            key={key.label}
            type="button"
            className={[
              'calc-key',
              key.variant && `calc-key--${key.variant}`,
              key.wide && 'calc-key--wide',
              key.action.type === 'operator' &&
                state.fresh &&
                state.operator === key.action.operator &&
                'is-armed',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => dispatch(key.action)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  )
}
