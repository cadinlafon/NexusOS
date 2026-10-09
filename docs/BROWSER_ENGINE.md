# NEXUS Browser and the Chromium engine

NEXUS Browser renders real websites with Chromium, through the Chromium
Embedded Framework (CEF), when NEXUS runs in its native host. In an ordinary
browser tab (`npm run dev`) it falls back to a preview engine that renders
nothing.

| Mode | Command | Engine |
|---|---|---|
| Native NEXUS | `npm run nexus:dev` | Chromium 154 via CEF. Real pages. |
| Web development | `npm run dev` | Preview engine. Tabs, history and policy work; no pages load. |

## Commands

| Command | What it does |
|---|---|
| `npm run nexus:dev` | Builds the native host if needed, starts NEXUS if it isn't running (`npm run dev` when `.env.local` exists, otherwise `npm run dev:local` with the Firebase emulator), and opens it with the real engine. Sign in as a student, then open NEXUS Browser |
| `npm run browser:build` | Builds `native/build/Release/NEXUS.app` |
| `npm run browser:setup` | Downloads and unpacks the prebuilt CEF binaries (run automatically by the build) |
| `npm run dev` | NEXUS in a browser tab, preview engine |
| `npm run build` | Type-check and production web build |

Arguments after `--` go to the native app, for example
`npm run nexus:dev -- --remote-debugging-port=9222` to inspect the pages
NEXUS is rendering from Chrome's `chrome://inspect`.

## Requirements

- macOS on Apple Silicon. This is the development host only.
- Xcode Command Line Tools (`xcode-select --install`). Full Xcode is not needed.
- CMake and Ninja: `brew install cmake ninja`.
- About 350 MB of disk for the CEF binaries, plus build output.

## Where CEF lives

There are two different things, and only one is used:

- `native/third_party/cef/` is the **prebuilt CEF binary distribution**
  (version 154.0.34, Chromium 154.0.8037.98). `npm run browser:setup`
  downloads it from https://cef-builds.spotifycdn.com and checks its
  checksum. The build links against this. It is not committed to git.
- `chromium/cef/` is the **CEF source repository**. It contains no compiled
  engine and only builds inside a full Chromium checkout (100+ GB and many
  hours). The build does not use it. It was useful as reference code.

To move to a newer CEF, change the version and checksum at the top of
`native/scripts/setup-cef.sh`, delete `native/third_party/cef`, and rebuild.

## How it fits together

```
NEXUS.app (native/src)
└── one window
    ├── shell browser      the NEXUS desktop: the React app from the dev server
    └── tab browsers       one Chromium browser per NEXUS Browser tab, drawn
                           as an overlay on top of the shell

React side (src/browser)
BrowserApp.tsx       tabs, back/forward/reload, address bar
BrowserManager.ts    owns tabs; every page load goes through open()
  address.ts         typed text → URL or search
  policy.ts          canNavigate(url) → NEXUS permissions and Test Mode
NativeEngine.ts      talks to the native host
PreviewEngine.ts     the web-development fallback
```

### How NEXUS talks to CEF

- **React → native:** `window.nexusNativeQuery` carries a JSON request
  (`createTab`, `navigate`, `goBack`, `goForward`, `reload`, `stop`,
  `closeTab`, `showTab`). `Host::OnQuery` in `native/src/nexus_host.cc`
  handles them.
- **Native → React:** the host calls `window.__nexusNativeEvent` with a tab's
  URL, title, loading state and whether it can go back or forward, every time
  any of those change.
- **Where the page is drawn:** the React UI measures the page area of the
  Browser window and sends it with `showTab`. The host moves that tab's
  Chromium view there and hides every other tab.

Only the NEXUS desktop page gets the bridge. Websites loaded in tabs never
see `nexusNativeQuery`, and the host also ignores requests from any browser
other than the shell. The shell itself is not allowed to navigate away from
the NEXUS desktop's address.

## Policy

```
Chromium (CEF)  →  native host  →  BrowserManager policy  →  NEXUS permissions
```

- **Navigation (enforced):** every top-level navigation in a tab is paused in
  the host (`OnBeforeResourceLoad`) until the React side answers through
  `policy.canNavigate(url)`. This covers typed addresses, links, redirects
  and scripts. Refusals show the normal NEXUS restriction dialog.
- **New windows and popups (enforced):** no page can open its own window. A
  link that asks for one becomes a new NEXUS tab, through the same check.
- **Downloads, camera/microphone/location prompts, DevTools:** not offered to
  pages at all in this build. `BrowserPolicy` in `src/browser/types.ts` has
  `canDownload`, `canRequestPermission` and `canUseDevTools` ready for when
  they are; the matching place in the host is marked "Policy seam".
- **Not yet covered:** clipboard, cookies, extensions, file access, and
  per-request network filtering. Sub-resources (images, scripts, frames) are
  not checked, only the page itself.

## Known limitations

- **The page always draws above the NEXUS UI.** A tab's page is a native view
  on top of the React desktop, so NEXUS windows, dialogs and menus cannot be
  drawn over it. Instead the page is hidden whenever anything overlaps its
  area, and the Browser window shows a short note in its place. Drawing pages
  into the UI itself (off-screen rendering) would remove this.
- **Square bottom corners.** The page covers the Browser window's rounded
  bottom corners.
- **Development server only.** The native host loads the NEXUS desktop from
  `http://localhost:5173`. It does not yet bundle the built web app.
- **macOS development host only.** There is no Linux host yet.
- **Not signed or packaged.** `NEXUS.app` runs from the build folder on this
  machine; it is not notarised for distribution.
- **Browsing data** (cookies, cache) is kept in
  `~/Library/Application Support/NEXUS`, shared by all tabs. There is no
  private mode and no per-student profile.
- No downloads, printing, find-in-page, page zoom, or favicons yet.

## Toward NEXUS OS on Linux

1. Build a Linux host from the same `nexus_host.cc`. The CEF Views code is
   cross-platform; `main_mac.mm`, the helper bundles and the CMake `OS_MAC`
   section are what need Linux equivalents. CEF publishes Linux binaries on
   the same download page.
2. Bundle the built NEXUS desktop into the host instead of using the dev
   server.
3. Make the host the session's shell: it starts at login, full screen, as
   the desktop.
4. Move policy decisions that must hold even if the UI misbehaves out of the
   page and into the host or a system policy service.
5. Let NEXUS Classroom reach the browser through that policy service
   (open a site for everyone, block a site, start Test Mode).
