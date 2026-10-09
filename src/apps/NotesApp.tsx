import { NotebookPen, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { sampleNotes, type Note } from '../data/appData'

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>(sampleNotes)
  const [activeId, setActiveId] = useState<string | null>(sampleNotes[0]?.id ?? null)

  const active = notes.find((note) => note.id === activeId)

  const createNote = () => {
    const note: Note = { id: crypto.randomUUID(), title: '', body: '' }
    setNotes((current) => [note, ...current])
    setActiveId(note.id)
  }

  const updateNote = (patch: Partial<Note>) =>
    setNotes((current) =>
      current.map((note) => (note.id === activeId ? { ...note, ...patch } : note)),
    )

  const deleteNote = () => {
    const index = notes.findIndex((note) => note.id === activeId)
    const remaining = notes.filter((note) => note.id !== activeId)
    setNotes(remaining)
    setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
  }

  return (
    <div className="app app--split">
      <aside className="app-sidebar app-sidebar--wide">
        <button type="button" className="app-button app-button--primary notes__new" onClick={createNote}>
          <Plus size={15} />
          New Note
        </button>
        <div className="notes__list">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={`note-row${note.id === activeId ? ' is-active' : ''}`}
              onClick={() => setActiveId(note.id)}
            >
              <span className="note-row__title">{note.title || 'New note'}</span>
              <span className="note-row__preview">{note.body.split('\n')[0] || 'No text yet'}</span>
            </button>
          ))}
        </div>
      </aside>

      {active ? (
        <section className="app-main notes__editor">
          <header className="app-toolbar">
            <input
              className="notes__title"
              value={active.title}
              onChange={(event) => updateNote({ title: event.target.value })}
              placeholder="Title"
              aria-label="Note title"
            />
            <button
              type="button"
              className="app-button app-button--danger"
              onClick={deleteNote}
              aria-label="Delete note"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </header>
          <textarea
            className="notes__body"
            value={active.body}
            onChange={(event) => updateNote({ body: event.target.value })}
            placeholder="Write something…"
            aria-label="Note text"
          />
        </section>
      ) : (
        <section className="app-main">
          <div className="app-empty">
            <NotebookPen size={26} strokeWidth={1.6} />
            <span>No notes yet. Create one to get started.</span>
          </div>
        </section>
      )}
    </div>
  )
}
