#include "src/nexus_renderer.h"

namespace nexus {

const char kShellMarker[] = "nexus_shell";

CefMessageRouterConfig BridgeConfig() {
  CefMessageRouterConfig config;
  config.js_query_function = "nexusNativeQuery";
  config.js_cancel_function = "nexusNativeQueryCancel";
  return config;
}

void RendererApp::OnWebKitInitialized() {
  router_ = CefMessageRouterRendererSide::Create(BridgeConfig());
}

void RendererApp::OnBrowserCreated(CefRefPtr<CefBrowser> browser,
                                   CefRefPtr<CefDictionaryValue> extra_info) {
  if (extra_info && extra_info->GetBool(kShellMarker)) {
    shell_browser_ids_.insert(browser->GetIdentifier());
  }
}

void RendererApp::OnBrowserDestroyed(CefRefPtr<CefBrowser> browser) {
  shell_browser_ids_.erase(browser->GetIdentifier());
}

bool RendererApp::IsShell(CefRefPtr<CefBrowser> browser) const {
  return shell_browser_ids_.count(browser->GetIdentifier()) > 0;
}

void RendererApp::OnContextCreated(CefRefPtr<CefBrowser> browser,
                                   CefRefPtr<CefFrame> frame,
                                   CefRefPtr<CefV8Context> context) {
  // Only the shell's top-level page gets the bridge functions.
  if (router_ && IsShell(browser) && frame->IsMain()) {
    router_->OnContextCreated(browser, frame, context);
  }
}

void RendererApp::OnContextReleased(CefRefPtr<CefBrowser> browser,
                                    CefRefPtr<CefFrame> frame,
                                    CefRefPtr<CefV8Context> context) {
  if (router_) {
    router_->OnContextReleased(browser, frame, context);
  }
}

bool RendererApp::OnProcessMessageReceived(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefProcessId source_process,
    CefRefPtr<CefProcessMessage> message) {
  return router_ && router_->OnProcessMessageReceived(browser, frame,
                                                      source_process, message);
}

}  // namespace nexus
