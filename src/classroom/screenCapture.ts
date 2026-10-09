// Screen viewing, student side: turns the NEXUS desktop into a self-contained
// copy the teacher view can display.
//
// The copy is the desktop's own page (its HTML and styles), not a recording of
// the monitor. Everything NEXUS draws is included. A website shown by the
// native Chromium engine is not part of the page, so the teacher sees the
// Browser window and its address but not the site's contents.

import { type ScreenSnapshot } from './types'

const FORM_FIELDS = 'input, textarea, select'

/** Builds a snapshot of the desktop as it is right now. */
export function captureDesktop(): Omit<ScreenSnapshot, 'id'> {
  const copy = document.documentElement.cloneNode(true) as HTMLElement

  // What has been typed or chosen lives on the elements, not in the markup.
  const liveFields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(FORM_FIELDS)
  copy.querySelectorAll(FORM_FIELDS).forEach((field, index) => {
    const live = liveFields[index]
    if (live instanceof HTMLTextAreaElement) field.textContent = live.value
    else if (live instanceof HTMLSelectElement) {
      field.querySelectorAll('option').forEach((option, i) => option.toggleAttribute('selected', i === live.selectedIndex))
    } else if (live.type === 'checkbox' || live.type === 'radio') field.toggleAttribute('checked', live.checked)
    // Passwords are never sent.
    else field.setAttribute('value', live.type === 'password' ? '' : live.value)
  })

  // Scroll positions are restored by a tiny script inside the copy.
  const liveElements = document.documentElement.querySelectorAll('*')
  copy.querySelectorAll('*').forEach((element, index) => {
    const live = liveElements[index]
    if (live && (live.scrollTop > 0 || live.scrollLeft > 0)) {
      element.setAttribute('data-nexus-scroll', `${live.scrollTop},${live.scrollLeft}`)
    }
  })

  // The copy must not run the app again.
  copy.querySelectorAll('script, vite-error-overlay').forEach((element) => element.remove())
  copy.querySelectorAll('[data-screen-note]').forEach((element) => {
    element.textContent = element.getAttribute('data-screen-note')
  })

  const head = copy.querySelector('head')!
  // Lets stylesheets and images in the copy load from the student's address.
  head.insertAdjacentHTML('afterbegin', `<base href="${location.origin}/">`)
  // A still picture: entry animations would replay on every update.
  head.insertAdjacentHTML(
    'beforeend',
    '<style>*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}</style>',
  )
  copy
    .querySelector('body')!
    .insertAdjacentHTML(
      'beforeend',
      '<script>document.querySelectorAll("[data-nexus-scroll]").forEach(function(e){var p=e.getAttribute("data-nexus-scroll").split(",");e.scrollTop=+p[0];e.scrollLeft=+p[1]})</script>',
    )

  return { html: `<!doctype html>${copy.outerHTML}`, width: window.innerWidth, height: window.innerHeight }
}

const MIN_INTERVAL_MS = 500

/**
 * Sends a snapshot now and again whenever the desktop changes, at most twice
 * a second. Returns a function that stops sharing.
 */
export function startScreenShare(send: (snapshot: Omit<ScreenSnapshot, 'id'>) => void) {
  let lastSent = 0
  let timer: number | undefined

  const flush = () => {
    timer = undefined
    lastSent = Date.now()
    send(captureDesktop())
  }
  const schedule = () => {
    if (timer !== undefined) return
    timer = window.setTimeout(flush, Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastSent)))
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
  // Typing and scrolling don't change the markup, so listen for them too.
  window.addEventListener('input', schedule, true)
  window.addEventListener('scroll', schedule, true)
  window.addEventListener('resize', schedule)
  schedule()

  return () => {
    observer.disconnect()
    window.removeEventListener('input', schedule, true)
    window.removeEventListener('scroll', schedule, true)
    window.removeEventListener('resize', schedule)
    window.clearTimeout(timer)
  }
}
