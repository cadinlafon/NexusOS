// Entry point for Chromium's helper processes (renderer, GPU, and so on).

#include "include/cef_app.h"
#include "include/cef_sandbox_mac.h"
#include "include/wrapper/cef_library_loader.h"
#include "src/nexus_renderer.h"

int main(int argc, char* argv[]) {
  // Helpers run inside the macOS sandbox.
  CefScopedSandboxContext sandbox_context;
  if (!sandbox_context.Initialize(argc, argv)) {
    return 1;
  }

  // The CEF framework is loaded at runtime, as the sandbox requires.
  CefScopedLibraryLoader library_loader;
  if (!library_loader.LoadInHelper()) {
    return 1;
  }

  CefMainArgs main_args(argc, argv);
  CefRefPtr<CefApp> app(new nexus::RendererApp);
  return CefExecuteProcess(main_args, app, nullptr);
}
