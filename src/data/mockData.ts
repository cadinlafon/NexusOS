// Seed data for NEXUS. This is the single source of mock content: the central
// state in src/state starts from these values and every screen reads from that
// state, so nothing here is duplicated per page. Replacing this file with real
// data sources later should not require touching the UI.

import {
  type Announcement,
  type Assignment,
  type Conversation,
  type DocumentDraft,
  type NexusNotification,
  type SchoolEvent,
  type Site,
  type Student,
  type TestSession,
} from '../types/nexus'

// Dates are relative to "now" so the prototype always looks current.
const daysFromToday = (offset: number, hour = 23, minute = 59) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

export const students: Student[] = [
  { id: 'cadin', name: 'Cadin LaFon', firstName: 'Cadin', initials: 'CL', role: 'Student', grade: 'Grade 10', studentNumber: 'S-20417' },
  { id: 'maya', name: 'Maya Okonkwo', firstName: 'Maya', initials: 'MO', role: 'Student', grade: 'Grade 10', studentNumber: 'S-20388' },
  { id: 'theo', name: 'Theo Marchetti', firstName: 'Theo', initials: 'TM', role: 'Student', grade: 'Grade 10', studentNumber: 'S-20402' },
  { id: 'aisha', name: 'Aisha Rahman', firstName: 'Aisha', initials: 'AR', role: 'Student', grade: 'Grade 10', studentNumber: 'S-20431' },
  { id: 'lucas', name: 'Lucas Brandt', firstName: 'Lucas', initials: 'LB', role: 'Student', grade: 'Grade 10', studentNumber: 'S-20376' },
  { id: 'nina', name: 'Nina Petrova', firstName: 'Nina', initials: 'NP', role: 'Student', grade: 'Grade 10', studentNumber: 'S-20455' },
]

export const school = 'Example School'

// Subjects, classes and the timetable are no longer mock data here: they are
// the school model in src/school, which NEXUS Classroom edits.

/** Time the prototype starts at, so there is a class in session to look at. */
export const defaultSimulatedTime = '09:20'

export const createAssignments = (): Assignment[] => [
  {
    id: 'a1',
    title: "Newton's Three Laws Essay",
    subjectId: 'science',
    description:
      'Write a short essay explaining each of Newton’s three laws of motion in your own words.',
    instructions: [
      'Explain each law in one paragraph.',
      'Give one everyday example for each law.',
      'Aim for 300 to 400 words in total.',
    ],
    assignedDate: daysFromToday(-4, 9, 0),
    dueDate: daysFromToday(1),
    status: 'in_progress',
    recommendedApp: 'docs',
    allowedApps: ['docs', 'browser', 'notes', 'files'],
    allowedWebsites: ['Encyclopedia', 'Library'],
  },
  {
    id: 'a2',
    title: 'Quadratic Equations Practice',
    subjectId: 'math',
    description: 'Solve the ten quadratic equations on the practice sheet and show your working.',
    instructions: [
      'Solve questions 1 to 6 by factorising.',
      'Use the quadratic formula for questions 7 to 10.',
      'Check each answer by substituting it back in.',
    ],
    assignedDate: daysFromToday(-2, 10, 0),
    dueDate: daysFromToday(2),
    status: 'not_started',
    recommendedApp: 'calculator',
    allowedApps: ['calculator', 'docs', 'desmos', 'geogebra'],
    allowedWebsites: ['Maths Practice'],
  },
  {
    id: 'a3',
    title: 'Build a React Component',
    subjectId: 'software-dev',
    description: 'Build a reusable card component in React that takes its content through props.',
    instructions: [
      'Create a Card component with a title, body and optional footer.',
      'Type its props with TypeScript.',
      'Render three different cards from one array of data.',
    ],
    assignedDate: daysFromToday(-1, 9, 0),
    dueDate: daysFromToday(5),
    status: 'not_started',
    recommendedApp: 'vscode',
    allowedApps: ['vscode', 'terminal', 'node', 'browser'],
    allowedWebsites: ['School Portal'],
  },
]

/** Assignments the Developer Preview can hand out to exercise notifications. */
export const assignmentTemplates: Omit<Assignment, 'id' | 'assignedDate' | 'dueDate' | 'status'>[] = [
  {
    title: 'Cell Structure Lab Report',
    subjectId: 'science',
    description: 'Write up what you observed in the plant and animal cell lab.',
    instructions: [
      'Describe what you saw under the microscope.',
      'Label a diagram of each cell type.',
      'Explain two differences between the cells.',
    ],
    recommendedApp: 'docs',
    allowedApps: ['docs', 'notes', 'files'],
    allowedWebsites: ['Encyclopedia'],
  },
  {
    title: 'Persuasive Paragraph',
    subjectId: 'english',
    description: 'Write one persuasive paragraph arguing for or against school uniforms.',
    instructions: ['State your position.', 'Give two reasons with evidence.', 'End with a clear closing line.'],
    recommendedApp: 'docs',
    allowedApps: ['docs', 'notes'],
    allowedWebsites: ['Library'],
  },
  {
    title: 'Linear Graphs Worksheet',
    subjectId: 'math',
    description: 'Plot the six linear equations and find where each pair of lines crosses.',
    instructions: ['Plot each equation.', 'Mark every intersection.', 'Write the coordinates of each one.'],
    recommendedApp: 'desmos',
    allowedApps: ['desmos', 'geogebra', 'calculator'],
    allowedWebsites: ['Maths Practice'],
  },
]

export const createConversations = (): Conversation[] => [
  {
    id: 'c1',
    teacher: 'Ms. Okafor',
    initials: 'MO',
    subjectId: 'science',
    unread: 1,
    messages: [
      { id: 'c1-1', from: 'teacher', text: 'Remember to bring your lab notebook tomorrow.', time: minutesAgo(20) },
    ],
  },
  {
    id: 'c2',
    teacher: 'Mrs. Lindqvist',
    initials: 'ML',
    subjectId: 'software-dev',
    unread: 0,
    messages: [
      { id: 'c2-1', from: 'student', text: 'Is it okay if my card component uses CSS modules?', time: minutesAgo(60 * 26) },
      { id: 'c2-2', from: 'teacher', text: 'Yes, that’s fine. Just keep the props typed.', time: minutesAgo(60 * 25) },
    ],
  },
  {
    id: 'c3',
    teacher: 'Mr. Reyes',
    initials: 'MR',
    subjectId: 'math',
    unread: 0,
    messages: [
      { id: 'c3-1', from: 'teacher', text: 'Reminder: bring a graphing calculator to Thursday’s class.', time: minutesAgo(60 * 30) },
    ],
  },
]

/** Lines the Developer Preview can deliver as a new teacher message. */
export const teacherMessageTemplates = [
  'Can you stay for five minutes after class today?',
  'Nice work on your last submission.',
  'Don’t forget the practice sheet is due this week.',
]

export const createAnnouncements = (): Announcement[] => [
  {
    id: 'n1',
    title: 'Science fair sign-ups are open',
    body: 'Projects can be solo or in pairs. Sign up with your science teacher before the end of next week.',
    from: 'School Office',
    date: minutesAgo(60 * 3),
  },
  {
    id: 'n2',
    title: 'Library hours extended for exam prep',
    body: 'The library will stay open until 5:30 PM, Monday to Thursday, for the rest of the term.',
    from: 'Library',
    date: minutesAgo(60 * 27),
  },
  {
    id: 'n3',
    title: 'Picture day is next week',
    body: 'Full uniform, please. Order forms went home with students this week.',
    from: 'School Office',
    date: minutesAgo(60 * 50),
  },
]

export const createNotifications = (): NexusNotification[] => [
  {
    id: 'seed-1',
    type: 'teacher_message',
    title: 'Message from Ms. Okafor',
    body: 'Remember to bring your lab notebook tomorrow.',
    time: minutesAgo(20),
    read: false,
    target: { kind: 'conversation', id: 'c1' },
  },
  {
    id: 'seed-2',
    type: 'new_assignment',
    title: 'New assignment',
    body: '“Build a React Component” has been assigned to you.',
    time: minutesAgo(75),
    read: false,
    target: { kind: 'assignment', id: 'a3' },
  },
  {
    id: 'seed-3',
    type: 'due_soon',
    title: 'Due tomorrow',
    body: '“Newton’s Three Laws Essay” is due tomorrow.',
    time: minutesAgo(60 * 2),
    read: true,
    target: { kind: 'assignment', id: 'a1' },
  },
  {
    id: 'seed-4',
    type: 'announcement',
    title: 'School announcement',
    body: 'Science fair sign-ups are open.',
    time: minutesAgo(60 * 3),
    read: true,
    target: { kind: 'page', id: 'announcements' },
  },
]

export const schoolEvents: SchoolEvent[] = [
  { id: 'e1', title: 'Picture day', detail: 'All day · Full uniform', date: daysFromToday(7, 9, 0) },
  { id: 'e2', title: 'Science fair sign-ups close', detail: 'End of day', date: daysFromToday(9, 15, 0) },
  { id: 'e3', title: 'Parent evening', detail: '6:00 PM · Main hall', date: daysFromToday(14, 18, 0) },
]

export const sites: Site[] = [
  { id: 'school-portal', label: 'School Portal', host: 'portal.example.school' },
  { id: 'library', label: 'Library', host: 'library.example.school' },
  { id: 'encyclopedia', label: 'Encyclopedia', host: 'wikipedia.org' },
  { id: 'maths-practice', label: 'Maths Practice', host: 'maths.example.school' },
  { id: 'formula-sheet', label: 'Formula Sheet', host: 'formulas.example.school' },
  { id: 'youtube', label: 'YouTube', host: 'youtube.com' },
  { id: 'games', label: 'Games', host: 'games.example.com' },
]

/** Non-app, non-site things that carry a permission. */
export const systemTargets = [{ key: 'system:settings', label: 'System Settings' }]

export const testSession: TestSession = {
  title: 'Chapter 4 Test',
  subjectId: 'math',
  // Settings stays reachable so the test can be ended from Developer Preview.
  allowedApps: ['calculator', 'docs', 'browser', 'settings'],
  allowedSites: ['formula-sheet'],
  restrictedPages: ['messages'],
}

export const createDocuments = (): Record<string, DocumentDraft> => ({
  a1: {
    title: "Newton's Three Laws",
    body:
      'Isaac Newton described three laws that explain how objects move.\n\n' +
      'The first law says that an object stays at rest, or keeps moving in a straight line at the same speed, unless a force acts on it. This is called inertia.\n\n' +
      'The second law says that force equals mass times acceleration. The harder you push something, the faster it speeds up, and heavier things need more force.\n\n' +
      'The third law says that ',
  },
  test: { title: 'Chapter 4 Test: Answers', body: '' },
  scratch: { title: 'Untitled document', body: '' },
})
