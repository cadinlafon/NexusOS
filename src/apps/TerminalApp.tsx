import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNexus } from '../state/NexusContext'
import { type Student } from '../types/nexus'

interface Line {
  id: number
  kind: 'input' | 'output'
  text: string
}

const PROMPT = 'student@nexus:~$'

const intro = [
  'NEXUS Terminal 0.7 (demo shell)',
  'Commands here are simulated and don’t touch the real system.',
  'Type "help" to see what’s available.',
]

/** Runs a demo command. Returns null when the screen should be cleared. */
function run(command: string, student: Student): string[] | null {
  const [name, ...args] = command.split(/\s+/)
  switch (name) {
    case 'help':
      return [
        'Available commands:',
        '  help     show this list',
        '  about    about NEXUS OS',
        '  date     show the current date and time',
        '  whoami   show the signed-in student',
        '  echo     print some text',
        '  clear    clear the screen',
      ]
    case 'about':
      return ['NEXUS OS 0.7', 'A school-focused operating system. This build is a desktop prototype.']
    case 'date':
      return [new Date().toString()]
    case 'whoami':
      return [`${student.name} (${student.role.toLowerCase()})`]
    case 'echo':
      return [args.join(' ')]
    case 'clear':
      return null
    default:
      return [`nexus: command not found: ${name}`, 'Type "help" for a list of commands.']
  }
}

export function TerminalApp() {
  const { student } = useNexus()
  const nextId = useRef(intro.length)
  const [lines, setLines] = useState<Line[]>(() =>
    intro.map((text, id) => ({ id, kind: 'output', text })),
  )
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [lines])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const command = input.trim()
    setInput('')

    const entered: Line = { id: nextId.current++, kind: 'input', text: command }
    if (!command) {
      setLines((current) => [...current, entered])
      return
    }

    const output = run(command, student)
    if (output === null) {
      setLines([])
      return
    }
    const printed = output.map<Line>((text) => ({ id: nextId.current++, kind: 'output', text }))
    setLines((current) => [...current, entered, ...printed])
  }

  return (
    <div className="app terminal" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
      {lines.map((line) => (
        <div key={line.id} className="terminal__line">
          {line.kind === 'input' && <span className="terminal__prompt">{PROMPT}</span>}
          <span>{line.text}</span>
        </div>
      ))}
      <form className="terminal__line" onSubmit={submit}>
        <label className="terminal__prompt" htmlFor="terminal-input">
          {PROMPT}
        </label>
        <input
          id="terminal-input"
          ref={inputRef}
          className="terminal__input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </form>
    </div>
  )
}
