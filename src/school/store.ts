import { loadJSON, saveJSON } from '../services/storage'
import { createSchoolSeed } from './seed'
import { type SchoolData } from './types'

const STORAGE_KEY = 'nexus.school'

/**
 * The student desktop's copy of the school model: the last one NEXUS
 * Classroom sent, or the starting school if none ever has. This is what lets a
 * desktop know its timetable while no teacher view is running.
 */
export function loadSchool(): SchoolData {
  const saved = loadJSON<SchoolData>(STORAGE_KEY)
  return saved && Array.isArray(saved.classes) && Array.isArray(saved.schedule)
    ? migrateSchool(saved as SchoolData)
    : createSchoolSeed()
}

/** NEXUS AI was registered as "ai" before 0.9; carry saved application lists over. */
export function migrateSchool(school: SchoolData): SchoolData {
  const rename = <T extends { appIds: string[] | null }>(item: T): T =>
    item.appIds?.includes('ai') ? { ...item, appIds: item.appIds.map((id) => (id === 'ai' ? 'nexus-ai' : id)) } : item
  return {
    ...school,
    subjects: school.subjects.map(rename),
    classes: school.classes.map(rename),
  } as SchoolData
}

export const saveSchool = (school: SchoolData) => saveJSON(STORAGE_KEY, school)
