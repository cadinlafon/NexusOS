// The school NEXUS starts with before a teacher changes anything. It is the
// same starting point on the teacher and student sides, so a student desktop
// has a timetable even when no teacher view has ever run.

import { type ClassPolicy, type ClassWebsite, type SchoolData, type ScheduleEntry } from './types'

export const openClassPolicy: ClassPolicy = {
  browser: 'school',
  applications: 'school',
  ai: 'school',
  internet: 'school',
}

const at = (hour: number, minute = 0) => hour * 60 + minute

const site = (name: string, url: string, description: string): ClassWebsite => ({ name, url, description })

const WEEKDAYS = [1, 2, 3, 4, 5]

export function createSchoolSeed(): SchoolData {
  const periods = [
    { number: 1, start: at(8), end: at(8, 55) },
    { number: 2, start: at(9), end: at(9, 55) },
    { number: 3, start: at(10), end: at(10, 55) },
    { number: 4, start: at(11, 30), end: at(12, 25) },
    { number: 5, start: at(13, 10), end: at(14, 5) },
    { number: 6, start: at(14, 10), end: at(15, 5) },
  ]

  // Each class meets in the same period every weekday.
  const everyWeekday = (classId: string, period: number): ScheduleEntry[] =>
    WEEKDAYS.map((day) => {
      const slot = periods.find((p) => p.number === period)!
      return { id: `${classId}-d${day}`, classId, day, start: slot.start, end: slot.end, period }
    })

  return {
    revision: 1,
    periods,
    teachers: [
      { id: 'lindqvist', name: 'Mrs. Lindqvist', initials: 'ML' },
      { id: 'okafor', name: 'Ms. Okafor', initials: 'MO' },
      { id: 'reyes', name: 'Mr. Reyes', initials: 'MR' },
      { id: 'abbott', name: 'Mr. Abbott', initials: 'MA' },
    ],
    subjects: [
      {
        id: 'science',
        name: 'Science',
        description: 'Biology, chemistry and physics.',
        icon: 'flask',
        color: '#34d399',
        appIds: ['browser', 'docs', 'files', 'notes', 'nexus-ai'],
        websites: [site('Wikipedia', 'https://www.wikipedia.org', 'Background reading for any topic')],
        defaultPolicy: openClassPolicy,
        ownerId: null,
      },
      {
        id: 'math',
        name: 'Math',
        description: 'Number, algebra, geometry and statistics.',
        icon: 'calculator',
        color: '#60a5fa',
        appIds: ['calculator', 'desmos', 'geogebra', 'browser', 'docs'],
        websites: [
          site('Desmos', 'https://www.desmos.com/calculator', 'Graphing calculator'),
          site('GeoGebra', 'https://www.geogebra.org', 'Geometry and algebra tools'),
        ],
        defaultPolicy: openClassPolicy,
        ownerId: null,
      },
      {
        id: 'software-dev',
        name: 'Software Development',
        description: 'Programming, software engineering and computer science.',
        icon: 'code',
        color: '#a78bfa',
        appIds: ['vscode', 'terminal', 'git', 'python', 'node', 'browser', 'github', 'nexus-ai'],
        websites: [
          site('GitHub', 'https://github.com', 'Host and share code'),
          site('MDN Web Docs', 'https://developer.mozilla.org', 'Web development documentation'),
          site('npm', 'https://www.npmjs.com', 'JavaScript packages'),
          site('PyPI', 'https://pypi.org', 'Python packages'),
          site('Stack Overflow', 'https://stackoverflow.com', 'Programming questions and answers'),
        ],
        defaultPolicy: openClassPolicy,
        ownerId: null,
      },
      {
        id: 'english',
        name: 'English',
        description: 'Reading, writing and discussion.',
        icon: 'book',
        color: '#fbbf24',
        appIds: ['docs', 'browser', 'notes', 'nexus-ai'],
        websites: [],
        defaultPolicy: openClassPolicy,
        ownerId: null,
      },
      {
        id: 'history',
        name: 'History',
        description: 'People, events and how we know about them.',
        icon: 'landmark',
        color: '#fb923c',
        appIds: ['browser', 'docs', 'notes'],
        websites: [],
        defaultPolicy: openClassPolicy,
        ownerId: null,
      },
    ],
    classes: [
      {
        id: 'cls-english-1',
        subjectId: 'english',
        name: 'English — Period 1',
        description: '',
        teacherId: 'abbott',
        grade: 'Grade 10',
        room: 'Room 12',
        studentIds: ['cadin', 'maya', 'theo', 'aisha', 'lucas', 'nina'],
        appIds: null,
        websites: [],
        policy: openClassPolicy,
      },
      {
        id: 'cls-softdev-2',
        subjectId: 'software-dev',
        name: 'Software Development — Period 2',
        description: 'Building for the web with React and TypeScript.',
        teacherId: 'lindqvist',
        grade: 'Grade 10',
        room: 'Lab 2',
        studentIds: ['cadin', 'maya', 'theo', 'aisha'],
        appIds: null,
        websites: [],
        policy: openClassPolicy,
      },
      {
        id: 'cls-math-3',
        subjectId: 'math',
        name: 'Math — Period 3',
        description: '',
        teacherId: 'reyes',
        grade: 'Grade 10',
        room: 'Room 7',
        studentIds: ['cadin', 'maya', 'theo', 'aisha', 'lucas', 'nina'],
        appIds: null,
        websites: [],
        policy: openClassPolicy,
      },
      {
        id: 'cls-science-4',
        subjectId: 'science',
        name: 'Science — Period 4',
        description: '',
        teacherId: 'okafor',
        grade: 'Grade 10',
        room: 'Lab 1',
        studentIds: ['cadin', 'maya', 'theo', 'aisha', 'lucas', 'nina'],
        appIds: null,
        websites: [],
        policy: openClassPolicy,
      },
      {
        id: 'cls-softdev-5',
        subjectId: 'software-dev',
        name: 'Software Development — Period 5',
        description: 'Introduction to programming with Python.',
        teacherId: 'lindqvist',
        grade: 'Grade 9',
        room: 'Lab 2',
        studentIds: ['lucas', 'nina'],
        appIds: ['python', 'terminal', 'browser', 'nexus-ai'],
        websites: [],
        policy: openClassPolicy,
      },
    ],
    schedule: [
      ...everyWeekday('cls-english-1', 1),
      ...everyWeekday('cls-softdev-2', 2),
      ...everyWeekday('cls-math-3', 3),
      ...everyWeekday('cls-science-4', 4),
      ...everyWeekday('cls-softdev-5', 5),
    ],
    assignments: [],
  }
}
