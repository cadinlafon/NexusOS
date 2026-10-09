// Sample content that belongs to a single app (files, notes, AI prompts).
// Anything shared between features lives in mockData.ts and the central state.

/* ---------- Files ---------- */

export type FileLocationId = 'home' | 'my-files' | 'downloads' | 'recent' | 'trash'

export interface FileLocation {
  id: FileLocationId
  label: string
}

export interface FileItem {
  id: string
  name: string
  kind: 'folder' | 'document' | 'text' | 'image'
  detail: string
}

export const fileLocations: FileLocation[] = [
  { id: 'home', label: 'Home' },
  { id: 'my-files', label: 'My Files' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'recent', label: 'Recent' },
  { id: 'trash', label: 'Trash' },
]

const folders: FileItem[] = [
  { id: 'f-bio', name: 'Biology', kind: 'folder', detail: '8 items' },
  { id: 'f-math', name: 'Mathematics', kind: 'folder', detail: '12 items' },
  { id: 'f-dev', name: 'Software Development', kind: 'folder', detail: '5 items' },
  { id: 'f-eng', name: 'English', kind: 'folder', detail: '9 items' },
]

const newtonDoc: FileItem = {
  id: 'd-newton',
  name: "Newton's Laws.docx",
  kind: 'document',
  detail: 'Edited today',
}

const projectNotes: FileItem = {
  id: 'd-notes',
  name: 'Project Notes.txt',
  kind: 'text',
  detail: 'Edited yesterday',
}

export const filesByLocation: Record<FileLocationId, FileItem[]> = {
  home: [...folders, newtonDoc, projectNotes],
  'my-files': [...folders, newtonDoc, projectNotes],
  downloads: [
    { id: 'dl-1', name: 'Science Fair Rules.pdf', kind: 'document', detail: 'Downloaded Monday' },
    { id: 'dl-2', name: 'Cell Diagram.png', kind: 'image', detail: 'Downloaded last week' },
  ],
  recent: [newtonDoc, projectNotes],
  trash: [],
}

/* ---------- Notes ---------- */

export interface Note {
  id: string
  title: string
  body: string
}

export const sampleNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Science fair ideas',
    body: 'Which paper bridge design holds the most weight?\nDoes music change how fast plants grow?\nAsk Ms. Okafor about borrowing the scales.',
  },
  {
    id: 'note-2',
    title: 'Math: quadratic formula',
    body: 'x = (-b ± √(b² - 4ac)) / 2a\nCheck the discriminant first to see how many answers there are.',
  },
  {
    id: 'note-3',
    title: 'React component checklist',
    body: 'Props typed\nNo unused state\nShow Mrs. Lindqvist before Monday',
  },
]

/* ---------- NEXUS AI ---------- */

export const aiSuggestions = [
  'What do I have to do right now?',
  'What’s due soon?',
  'What’s my next class?',
]
