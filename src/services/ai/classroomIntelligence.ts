import { type RosterEntry } from '../../classroom/types'
import { type SchoolAssignment, type SchoolClass, type SchoolData } from '../../school/types'
import { aiService } from './aiService'
import { type DecisionAnswer } from './types'

// Classroom Intelligence: what a teacher is told about their classes' work.
//
// The numbers are counted here, in ordinary code, from data NEXUS already
// holds: the classes a teacher teaches, the work set for them, and what each
// connected student desktop reports. No model produces or alters a number.
//
// A model is only asked for an opinion on top of those numbers (is a reminder
// worth sending? how urgent is it?) and for draft wording. It is sent totals
// and the assignment's title, never a student's name or their individual
// progress. It cannot act: every suggestion is for the teacher to use or
// ignore, and nothing here grades, disciplines or judges a student.

export interface AssignmentProgress {
  assignment: SchoolAssignment
  className: string
  enrolled: number
  /** Enrolled students whose desktops are connected and reporting right now. */
  reporting: number
  notStarted: number
  inProgress: number
  submitted: number
  /** Enrolled students NEXUS has no report from. Their progress is not known, not assumed. */
  unknown: number
  /** Whole days until it is due. Negative once it is overdue. */
  daysUntilDue: number
}

export interface ClassTrends {
  assignments: number
  dueWithinTwoDays: number
  overdue: number
  /** Of the progress NEXUS can see, how much has not been started (0 to 1), or null with nothing to see. */
  notStartedShare: number | null
  reportingShare: number | null
}

const DAY = 24 * 60 * 60 * 1000

/** Counts progress for every assignment in the given classes. Deterministic: no AI involved. */
export function assignmentProgress(school: SchoolData, classes: SchoolClass[], roster: RosterEntry[], now: Date): AssignmentProgress[] {
  const online = new Map(roster.filter((entry) => entry.online).map((entry) => [entry.id, entry]))

  return school.assignments
    .flatMap((assignment) => {
      const cls = classes.find((c) => c.id === assignment.classId)
      if (!cls) return []
      const progress: AssignmentProgress = {
        assignment,
        className: cls.name,
        enrolled: cls.studentIds.length,
        reporting: 0,
        notStarted: 0,
        inProgress: 0,
        submitted: 0,
        unknown: 0,
        daysUntilDue: Math.floor((new Date(assignment.dueDate).getTime() - now.getTime()) / DAY),
      }
      for (const studentId of cls.studentIds) {
        const status = online.get(studentId)?.assignments.find((a) => a.id === assignment.id)?.status
        if (!status) progress.unknown++
        else {
          progress.reporting++
          if (status === 'submitted') progress.submitted++
          else if (status === 'in_progress') progress.inProgress++
          else progress.notStarted++
        }
      }
      return [progress]
    })
    .sort((a, b) => a.assignment.dueDate.localeCompare(b.assignment.dueDate))
}

export function classTrends(progress: AssignmentProgress[]): ClassTrends {
  const seen = progress.reduce((total, p) => total + p.reporting, 0)
  const possible = progress.reduce((total, p) => total + p.enrolled, 0)
  return {
    assignments: progress.length,
    dueWithinTwoDays: progress.filter((p) => p.daysUntilDue >= 0 && p.daysUntilDue <= 2).length,
    overdue: progress.filter((p) => p.daysUntilDue < 0).length,
    notStartedShare: seen ? progress.reduce((total, p) => total + p.notStarted, 0) / seen : null,
    reportingShare: possible ? seen / possible : null,
  }
}

/** A fixed rule, not a model: due within two days and someone NEXUS can see has not started. */
export const reminderSuggested = (p: AssignmentProgress) => p.notStarted > 0 && p.daysUntilDue >= 0 && p.daysUntilDue <= 2

const dueText = (days: number) =>
  days < 0 ? `was due ${-days} day${days === -1 ? '' : 's'} ago` : days === 0 ? 'is due today' : `is due in ${days} day${days === 1 ? '' : 's'}`

/** The totals as one sentence. This is all a model is told about progress. */
export const describeProgress = (p: AssignmentProgress) =>
  `An assignment ${dueText(p.daysUntilDue)}. ${p.enrolled} students are in the class. Progress is known for ${p.reporting} of them: ${p.notStarted} not started, ${p.inProgress} in progress, ${p.submitted} submitted. Progress is unknown for the other ${p.unknown}.`

export interface Recommendation {
  model: string
  /** How likely the model thinks a reminder is worthwhile, 0 to 1. */
  remind: number
  priority: 'high' | 'medium' | 'low' | null
}

/** Asks the decision model for an opinion on one assignment's totals. Advice only. */
export async function recommend(p: AssignmentProgress): Promise<Recommendation> {
  const { model, answers } = await aiService.decide(describeProgress(p), {
    remind: { type: 'noul', instructions: 'The teacher should send the class a reminder about this assignment today' },
    priority: {
      type: 'choice',
      instructions: 'How urgent is it for the teacher to follow up on this assignment?',
      criteria: {
        high: 'Due very soon or overdue, and students have not started',
        medium: 'Due soon, or some students are behind',
        low: 'Plenty of time left, or most students are on track',
      },
    },
  })
  const remind: DecisionAnswer | undefined = answers.remind
  const priority: DecisionAnswer | undefined = answers.priority
  const choice = priority?.type === 'choice' ? priority.choice : null
  return {
    model,
    remind: remind?.type === 'noul' ? remind.noul : 0,
    priority: choice === 'high' || choice === 'medium' || choice === 'low' ? choice : null,
  }
}

export interface Draft {
  model: string
  text: string
}

const draft = async (prompt: string): Promise<Draft> => {
  const reply = await aiService.sendMessage({
    capability: 'chat',
    persona: 'teacher',
    allowed: true,
    history: [{ role: 'user', content: prompt }],
  })
  return { model: reply.model ?? '', text: reply.text.trim() }
}

/** A short reminder for the teacher to edit and send themselves. Only the title and due date are shared. */
export const draftReminder = (p: AssignmentProgress) =>
  draft(
    `Write a short, friendly reminder (two or three sentences, no greeting line, no sign-off, no placeholders) to a whole class about the assignment "${p.assignment.title}", which ${dueText(p.daysUntilDue)}. Do not mention any individual student.`,
  )

/** Review questions from the assignment's own title and description. */
export const draftReviewQuestions = (p: AssignmentProgress) =>
  draft(
    `Write five review questions a teacher could ask a class to check understanding for this assignment. Number them. Questions only, no answers.\n\nTitle: ${p.assignment.title}\nDescription: ${p.assignment.description}`,
  )
