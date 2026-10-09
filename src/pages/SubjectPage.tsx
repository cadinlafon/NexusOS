import { ArrowUpRight } from 'lucide-react'
import { browser } from '../browser/BrowserManager'
import { AppIcon } from '../components/AppIcon'
import { AssignmentCard } from '../components/AssignmentCard'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { getApp } from '../data/apps'
import { classApps, classesForStudent, classWebsites, describeSchedule } from '../school/timeEngine'
import { useNexus } from '../state/NexusContext'

interface SubjectPageProps {
  subjectId: string
}

/** A subject as the student takes it: their class, its teacher, times, apps and websites. */
export function SubjectPage({ subjectId }: SubjectPageProps) {
  const { school, student, getSubject, assignments, currentClass, launchApp, isInstalled } = useNexus()
  const subject = getSubject(subjectId)
  // The student's own class in this subject, as set up in NEXUS Classroom.
  const cls = classesForStudent(school, student.id).find((c) => c.subjectId === subjectId)
  if (!subject) return null

  const subjectAssignments = assignments.filter((a) => a.subjectId === subject.id)
  const inSession = currentClass?.subject.id === subject.id
  const apps = cls ? classApps(school, cls).map(getApp) : []
  const websites = cls ? classWebsites(school, cls) : []
  const times = cls ? describeSchedule(school, cls.id) : []

  const openSite = (url: string) => {
    launchApp('browser')
    void browser.openInTab(url)
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={inSession ? 'Subject · In session now' : 'Subject'}
        title={subject.name}
        description={
          cls
            ? [`Taught by ${subject.teacher}`, cls.room, ...times].filter(Boolean).join(' · ')
            : 'You aren’t enrolled in a class for this subject.'
        }
      />

      {apps.length > 0 && (
        <section className="section">
          <SectionHeader eyebrow="For this class" title="Recommended apps" />
          <div className="chip-row">
            {apps.map((app) => (
              <button key={app.id} type="button" className="chip chip--glass" onClick={() => launchApp(app.id)}>
                <AppIcon app={app} size="sm" />
                {app.name}
                {!isInstalled(app.id) && <span className="chip__tag">Get</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {websites.length > 0 && (
        <section className="section">
          <SectionHeader eyebrow="For this class" title="Websites" />
          <div className="site-list">
            {websites.map((site) => (
              <button key={site.url} type="button" className="site-row glass lift" onClick={() => openSite(site.url)}>
                <span className="browser__shortcut-icon">{site.name[0]}</span>
                <span className="site-row__text">
                  <span className="site-row__name">{site.name}</span>
                  <span className="site-row__detail">{site.description || site.url}</span>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <SectionHeader eyebrow="Keep moving" title="Assignments" />
        {subjectAssignments.length > 0 ? (
          <div className="assignment-grid">
            {subjectAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        ) : (
          <div className="empty glass">Nothing set for {subject.name} right now.</div>
        )}
      </section>
    </div>
  )
}
