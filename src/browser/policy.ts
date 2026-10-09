import { sites } from '../data/mockData'
import { type ResolvedPermission } from '../types/nexus'
import { type BrowserPolicy, type PolicyDecision } from './types'

const allow: PolicyDecision = { allowed: true }

/** Allows everything. Used until NEXUS supplies the school's policy. */
export const openPolicy: BrowserPolicy = {
  canNavigate: () => allow,
  canDownload: () => allow,
  canOpenPopup: () => allow,
  canRequestPermission: () => allow,
  canUseDevTools: () => allow,
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/** The NEXUS site a URL belongs to, matching the site's host and its subdomains. */
export const siteForUrl = (url: string) => {
  const host = hostOf(url)
  return sites.find((site) => host === site.host || host.endsWith(`.${site.host}`))
}

/**
 * The browser policy backed by NEXUS's existing permission system: a site's
 * allowed / restricted / blocked state and Test Mode's approved-site list are
 * what decide navigation. Nothing new is restricted here.
 */
export function createSchoolPolicy(getPermission: (key: string) => ResolvedPermission): BrowserPolicy {
  return {
    ...openPolicy,
    canNavigate(url) {
      const site = siteForUrl(url)
      const host = hostOf(url).replace(/^www\./, '')
      const key = `site:${site?.id ?? host}`
      return getPermission(key).state === 'allowed'
        ? allow
        : { allowed: false, key, label: site?.label ?? host }
    },
  }
}
