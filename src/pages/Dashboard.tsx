import { Bell, ClipboardList, MessageCircle } from 'lucide-react'
import { AnnouncementCard } from '../components/AnnouncementCard'
import { AssignmentCard } from '../components/AssignmentCard'
import { AssignmentStatus } from '../components/AssignmentStatus'
import { SectionHeader } from '../components/SectionHeader'
import { StatCard } from '../components/StatCard'
import { TestModeCard } from '../components/TestModeCard'
import { getApp } from '../data/apps'
import { useNexus } from '../state/NexusContext'
import { dueLabel, dueThisWeek, formatMinutes, formatPeriod, openAssignments } from '../state/selectors'

const greetingFor = (hour: number) =>
  hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

export function Dashboard() {
  const {
    now,
    student,
    assignments,
    currentClass,
    upcomingClasses,
    currentAssignment,
    unreadMessages,
    unreadNotifications,
    testMode,
    navigate,
    openAssignment,
    openNotification,
    getSubject,
  } = useNexus()

  const [time, suffix] = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).split(' ')
  const clock = { time, suffix }
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const open = openAssignments(assignments)
  const assignmentSubject = currentAssignment ? getSubject(currentAssignment.subjectId) : undefined
  const latestUnread = unreadNotifications[0]

  return (
    <div className="page">
      <section className="hero hero--desktop">
        <div>
          <div className="eyebrow">
            {weekday} <span aria-hidden="true">•</span> {monthDay}
          </div>
          <h1 className="hero__title">
            {greetingFor(now.getHours())}, <span className="hero__name">{student.firstName}</span>.
          </h1>
          <p className="hero__subtitle">
            {currentClass
              ? `You’re in ${currentClass.subject.name} until ${formatMinutes(currentClass.period.end)}.`
              : 'No class right now.'}
          </p>
        </div>
        <time className="hero__clock" dateTime={now.toISOString()}>
          {clock.time}
          <span className="hero__clock-suffix">{clock.suffix}</span>
        </time>
      </section>

      {testMode ? <TestModeCard /> : <AnnouncementCard />}

      <section className="section">
        <SectionHeader eyebrow="Right now" title="Where you are" />
        <div className="now-grid">
          <button
            type="button"
            className="now-card glass lift"
            style={{ '--subject': currentClass?.subject.color ?? 'var(--text-3)' } as React.CSSProperties}
            onClick={() =>
              navigate(currentClass ? { kind: 'subject', id: currentClass.subject.id } : { kind: 'page', id: 'calendar' })
            }
          >
            <span className="now-card__label">
              <span className={`live-dot${currentClass ? '' : ' live-dot--idle'}`} />
              Current class
            </span>
            <span className="now-card__title">
              {currentClass?.subject.name ?? (upcomingClasses[0] ? 'Free period' : 'No class right now')}
            </span>
            <span className="now-card__detail">
              {currentClass
                ? [formatPeriod(currentClass.period), currentClass.period.room, currentClass.subject.teacher]
                    .filter(Boolean)
                    .join(' · ')
                : upcomingClasses[0]
                  ? `Next: ${upcomingClasses[0].subject.name} at ${formatMinutes(upcomingClasses[0].period.start)}`
                  : 'You’re done for today'}
            </span>
          </button>

          {currentAssignment ? (
            <button
              type="button"
              className="now-card glass lift"
              style={{ '--subject': assignmentSubject?.color ?? 'var(--accent)' } as React.CSSProperties}
              onClick={() => openAssignment(currentAssignment.id)}
            >
              <span className="now-card__label">
                <span className="subject-dot" />
                Current assignment · {assignmentSubject?.name}
              </span>
              <span className="now-card__title">{currentAssignment.title}</span>
              <span className="now-card__detail">
                {dueLabel(currentAssignment.dueDate, now)} · Recommended: {getApp(currentAssignment.recommendedApp).name}
              </span>
              <AssignmentStatus status={currentAssignment.status} />
            </button>
          ) : (
            <div className="now-card glass">
              <span className="now-card__label">Current assignment</span>
              <span className="now-card__title">Nothing to do</span>
              <span className="now-card__detail">Everything has been handed in.</span>
            </div>
          )}

          <div className="now-card now-card--list glass">
            <span className="now-card__label">Upcoming</span>
            {upcomingClasses.length > 0 ? (
              <ul className="upcoming">
                {upcomingClasses.slice(0, 3).map(({ period, subject }) => (
                  <li key={period.id} style={{ '--subject': subject.color } as React.CSSProperties}>
                    <span className="subject-dot" />
                    <span className="upcoming__name">{subject.name}</span>
                    <span className="upcoming__time">{formatMinutes(period.start)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="now-card__detail">No more classes today.</span>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeader eyebrow="Your day" title="What's happening" />
        <div className="stat-grid">
          <StatCard
            icon={ClipboardList}
            label="Assignments"
            value={String(open.length)}
            detail={`${dueThisWeek(assignments, now).length} due this week`}
            onClick={() => navigate({ kind: 'page', id: 'assignments' })}
          />
          <StatCard
            icon={MessageCircle}
            label="Messages"
            value={String(unreadMessages)}
            detail={unreadMessages === 1 ? 'unread message' : 'unread messages'}
            onClick={() => navigate({ kind: 'page', id: 'messages' })}
          />
          <StatCard
            icon={Bell}
            label="Notifications"
            value={String(unreadNotifications.length)}
            detail={latestUnread ? latestUnread.title : 'All caught up'}
            onClick={() => latestUnread && openNotification(latestUnread)}
          />
        </div>
      </section>

      <section className="section">
        <SectionHeader eyebrow="Keep moving" title="Your assignments" />
        <div className="assignment-grid">
          {assignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      </section>
    </div>
  )
}
