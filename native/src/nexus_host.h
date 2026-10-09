// The NEXUS native host.
//
// It owns one window. The window is filled by the "shell" browser, which shows
// the NEXUS desktop (the React app). Each NEXUS Browser tab is a second kind of
// browser: a real Chromium view laid over the shell, positioned wherever the
// React UI says its page area is.
//
//   React (BrowserEngine)  --nexusNativeQuery-->  Host::OnQuery
//   React (event listener) <--__nexusNativeEvent-- Host::Emit
//
// Everything a web page in a tab can do that school policy might care about
// passes through this class first (see the "Policy seam" section).

#ifndef NEXUS_NATIVE_SRC_NEXUS_HOST_H_
#define NEXUS_NATIVE_SRC_NEXUS_HOST_H_

#include <map>
#include <memory>
#include <string>

#include "include/cef_client.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_overlay_controller.h"
#include "include/views/cef_window.h"
#include "include/wrapper/cef_message_router.h"

namespace nexus {

class Host : public CefClient,
             public CefLifeSpanHandler,
             public CefDisplayHandler,
             public CefLoadHandler,
             public CefRequestHandler,
             public CefResourceRequestHandler,
             public CefMessageRouterBrowserSide::Handler {
 public:
  // Creates the host and its window. Must be called on the UI thread.
  static void Create(const std::string& shell_url);
  // The single host, or nullptr before Create() and after shutdown.
  static Host* Get();

  // Asks the window to close, which ends the application.
  void RequestQuit();

  // Called by the window delegate.
  void OnWindowCreated(CefRefPtr<CefWindow> window);
  bool CanCloseWindow();
  void OnWindowDestroyed();

  // CefClient:
  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { return this; }
  CefRefPtr<CefDisplayHandler> GetDisplayHandler() override { return this; }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override { return this; }
  CefRefPtr<CefRequestHandler> GetRequestHandler() override { return this; }
  bool OnProcessMessageReceived(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                CefProcessId source_process,
                                CefRefPtr<CefProcessMessage> message) override;

  // CefLifeSpanHandler:
  void OnAfterCreated(CefRefPtr<CefBrowser> browser) override;
  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override;
  bool OnBeforePopup(CefRefPtr<CefBrowser> browser,
                     CefRefPtr<CefFrame> frame,
                     int popup_id,
                     const CefString& target_url,
                     const CefString& target_frame_name,
                     WindowOpenDisposition target_disposition,
                     bool user_gesture,
                     const CefPopupFeatures& popupFeatures,
                     CefWindowInfo& windowInfo,
                     CefRefPtr<CefClient>& client,
                     CefBrowserSettings& settings,
                     CefRefPtr<CefDictionaryValue>& extra_info,
                     bool* no_javascript_access) override;

  // CefDisplayHandler:
  void OnAddressChange(CefRefPtr<CefBrowser> browser,
                       CefRefPtr<CefFrame> frame,
                       const CefString& url) override;
  void OnTitleChange(CefRefPtr<CefBrowser> browser,
                     const CefString& title) override;

  // CefLoadHandler:
  void OnLoadingStateChange(CefRefPtr<CefBrowser> browser,
                            bool isLoading,
                            bool canGoBack,
                            bool canGoForward) override;
  void OnLoadStart(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefFrame> frame,
                   TransitionType transition_type) override;
  void OnLoadError(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefFrame> frame,
                   ErrorCode errorCode,
                   const CefString& errorText,
                   const CefString& failedUrl) override;

  // CefRequestHandler:
  bool OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                      CefRefPtr<CefFrame> frame,
                      CefRefPtr<CefRequest> request,
                      bool user_gesture,
                      bool is_redirect) override;
  CefRefPtr<CefResourceRequestHandler> GetResourceRequestHandler(
      CefRefPtr<CefBrowser> browser,
      CefRefPtr<CefFrame> frame,
      CefRefPtr<CefRequest> request,
      bool is_navigation,
      bool is_download,
      const CefString& request_initiator,
      bool& disable_default_handling) override;
  void OnRenderProcessTerminated(CefRefPtr<CefBrowser> browser,
                                 TerminationStatus status,
                                 int error_code,
                                 const CefString& error_string) override;

  // CefResourceRequestHandler (called on the IO thread):
  ReturnValue OnBeforeResourceLoad(CefRefPtr<CefBrowser> browser,
                                   CefRefPtr<CefFrame> frame,
                                   CefRefPtr<CefRequest> request,
                                   CefRefPtr<CefCallback> callback) override;

  // CefMessageRouterBrowserSide::Handler: requests from the React UI.
  bool OnQuery(CefRefPtr<CefBrowser> browser,
               CefRefPtr<CefFrame> frame,
               int64_t query_id,
               const CefString& request,
               bool persistent,
               CefRefPtr<Callback> callback) override;

 private:
  // One NEXUS Browser tab and the Chromium browser behind it.
  struct Tab {
    std::string id;
    CefRefPtr<CefBrowserView> view;
    CefRefPtr<CefOverlayController> overlay;
    CefRefPtr<CefBrowser> browser;
    // A navigation requested before Chromium finished creating the browser.
    std::string pending_url;

    std::string url;
    std::string title;
    std::string error;
    bool loading = false;
    bool can_go_back = false;
    bool can_go_forward = false;
  };

  explicit Host(const std::string& shell_url);
  ~Host() override;

  bool IsShell(CefRefPtr<CefBrowser> browser) const;
  Tab* FindTab(const std::string& id);
  Tab* FindTab(CefRefPtr<CefBrowser> browser);

  // Tab operations, driven by OnQuery.
  std::string CreateTab();
  void Navigate(Tab* tab, const std::string& url);
  void CloseTab(const std::string& id);
  void CloseAllTabs();
  // Shows |tab_id| at |bounds| (window coordinates) and hides every other tab.
  // An empty id hides them all.
  void ShowTab(const std::string& tab_id, const CefRect& bounds);

  // Sends an event to the React UI.
  void Emit(CefRefPtr<CefDictionaryValue> event);
  void EmitTab(const Tab& tab);

  // --- Policy seam -------------------------------------------------------
  // Top-level navigations in a tab are paused here and the React UI (which
  // holds school policy) is asked. Popups are turned into requests for a new
  // tab. Downloads, permission prompts and DevTools are not offered at all
  // yet; when they are, their decisions belong here too.
  void AskNavigationPolicy(int browser_id,
                           const std::string& url,
                           CefRefPtr<CefCallback> callback);
  void ResolveNavigationPolicy(int request_id, bool allowed);
  void CancelPendingPolicyRequests();

  const std::string shell_url_;
  std::string shell_origin_;

  CefRefPtr<CefWindow> window_;
  CefRefPtr<CefBrowserView> shell_view_;
  CefRefPtr<CefBrowser> shell_browser_;
  CefRefPtr<CefMessageRouterBrowserSide> router_;

  std::map<std::string, std::unique_ptr<Tab>> tabs_;
  int next_tab_id_ = 1;

  std::map<int, CefRefPtr<CefCallback>> pending_policy_;
  int next_policy_id_ = 1;

  int browser_count_ = 0;

  IMPLEMENT_REFCOUNTING(Host);
  DISALLOW_COPY_AND_ASSIGN(Host);
};

}  // namespace nexus

#endif  // NEXUS_NATIVE_SRC_NEXUS_HOST_H_
