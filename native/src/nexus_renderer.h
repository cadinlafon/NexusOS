// Runs inside Chromium's renderer processes. Its one job is to give the NEXUS
// desktop page (and only that page) a way to talk to the native host.

#ifndef NEXUS_NATIVE_SRC_NEXUS_RENDERER_H_
#define NEXUS_NATIVE_SRC_NEXUS_RENDERER_H_

#include <set>

#include "include/cef_app.h"
#include "include/wrapper/cef_message_router.h"

namespace nexus {

// Passed in a browser's extra_info to mark it as the NEXUS desktop shell.
extern const char kShellMarker[];

// The bridge function names the shell page sees on `window`.
CefMessageRouterConfig BridgeConfig();

class RendererApp : public CefApp, public CefRenderProcessHandler {
 public:
  RendererApp() = default;

  CefRefPtr<CefRenderProcessHandler> GetRenderProcessHandler() override {
    return this;
  }

  // CefRenderProcessHandler:
  void OnWebKitInitialized() override;
  void OnBrowserCreated(CefRefPtr<CefBrowser> browser,
                        CefRefPtr<CefDictionaryValue> extra_info) override;
  void OnBrowserDestroyed(CefRefPtr<CefBrowser> browser) override;
  void OnContextCreated(CefRefPtr<CefBrowser> browser,
                        CefRefPtr<CefFrame> frame,
                        CefRefPtr<CefV8Context> context) override;
  void OnContextReleased(CefRefPtr<CefBrowser> browser,
                         CefRefPtr<CefFrame> frame,
                         CefRefPtr<CefV8Context> context) override;
  bool OnProcessMessageReceived(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                CefProcessId source_process,
                                CefRefPtr<CefProcessMessage> message) override;

 private:
  bool IsShell(CefRefPtr<CefBrowser> browser) const;

  CefRefPtr<CefMessageRouterRendererSide> router_;
  // Browsers in this process that are the NEXUS shell. Web pages in tabs are
  // never in here, so they never receive the bridge.
  std::set<int> shell_browser_ids_;

  IMPLEMENT_REFCOUNTING(RendererApp);
  DISALLOW_COPY_AND_ASSIGN(RendererApp);
};

}  // namespace nexus

#endif  // NEXUS_NATIVE_SRC_NEXUS_RENDERER_H_
