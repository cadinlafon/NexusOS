import { getApp } from '../../data/apps'
import { dueLabel, formatMinutes, statusLabels } from '../../state/selectors'
import { type AppId, type ClassPeriod, type NexusContextSnapshot, type Subject } from '../../types/nexus'
import { type AIContext } from './types'

interface ContextSources {
  snapshot: NexusContextSnapshot
  schedule: ClassPeriod[]
  subjects: Subject[]
  openApps: AppId[]
  classWebsites: { name: string }[]
}

const appNames = (ids: AppId[]) => ids.map((id) => getApp(id).name)

/**
 * Turns the NEXUS Context into what the AI provider is sent. The snapshot
 * holds the student's name and number; none of that is copied across.
 */
export function buildAIContext({ snapshot, schedule, subjects, openApps, classWebsites }: ContextSources): AIContext {
  const { currentClass, nextClass, currentAssignment, time } = snapshot
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? 'Class'

  return {
    localTime: time.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }),
    currentClass: currentClass && {
      subject: currentClass.subject.name,
      room: currentClass.period.room,
      ends: formatMinutes(currentClass.period.end),
    },
    nextClass: nextClass && { subject: nextClass.subject.name, starts: formatMinutes(nextClass.period.start) },
    scheduleToday: schedule.map((period) => ({
      subject: subjectName(period.subjectId),
      time: `${formatMinutes(period.start)}–${formatMinutes(period.end)}`,
    })),
    currentAssignment: currentAssignment && {
      title: currentAssignment.title,
      subject: subjectName(currentAssignment.subjectId),
      status: statusLabels[currentAssignment.status],
      due: dueLabel(currentAssignment.dueDate, time),
      recommendedApp: getApp(currentAssignment.recommendedApp).name,
    },
    dueSoon: snapshot.dueSoon.map((a) => ({ title: a.title, due: dueLabel(a.dueDate, time) })),
    openApplications: appNames(openApps.filter((id) => id !== 'nexus-ai')),
    recommendedApplications: appNames(snapshot.recommendedApps),
    allowedApplications: appNames(snapshot.allowedApps),
    classWebsites: classWebsites.map((site) => site.name),
    testMode: snapshot.testMode !== null,
  }
}
