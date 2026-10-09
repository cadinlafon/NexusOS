#include "src/nexus_host.h"

#include <utility>

#include "include/base/cef_callback.h"
#include "include/cef_app.h"
#include "include/cef_parser.h"
#include "include/views/cef_browser_view_delegate.h"
#include "include/views/cef_window_delegate.h"
#include "include/wrapper/cef_closure_task.h"
#include "include/wrapper/cef_helpers.h"
#include "src/nexus_renderer.h"

namespace nexus {

namespace {

Host* g_host = nullptr;

const char kBlankUrl[] = "about:blank";

std::string ToJson(CefRefPtr<CefDictionaryValue> dictionary) {
  CefRefPtr<CefValue> value = CefValue::Create();
  value->SetDictionary(dictionary);
  return CefWriteJSON(value, JSON_WRITER_DEFAULT).ToString();
}

// "http://localhost:5173/anything" -> "http://localhost:5173"
std::string OriginOf(const std::string& url) {
  CefURLParts parts;
  if (!CefParseURL(url, parts)) {
    return std::string();
  }
  std::string origin = CefString(&parts.scheme).ToString() + "://" +
                       CefString(&parts.host).ToString();
  const std::string port = CefString(&parts.port).ToString();
  if (!port.empty()) {
    origin += ":" + port;
  }
  return origin;
}

bool IsWebUrl(const std::string& url) {
  return url.rfind("http://", 0) == 0 || url.rfind("https://", 0) == 0;
}

// The host's one top-level window.
class WindowDelegate : public CefWindowDelegate {
 public:
  explicit WindowDelegate(CefRefPtr<Host> host) : host_(host) {}

  void OnWindowCreated(CefRefPtr<CefWindow> window) override {
    host_->OnWindowCreated(window);
  }

  bool CanClose(CefRefPtr<CefWindow> window) override {
    return host_->CanCloseWindow();
  }

  void OnWindowDestroyed(CefRefPtr<CefWindow> window) override {
    host_->OnWindowDestroyed();
    host_ = nullptr;
  }

  CefSize GetPreferredSize(CefRefPtr<CefView> view) override {
    return CefSize(1440, 900);
  }

  CefSize GetMinimumSize(CefRefPtr<CefView> view) override {
    return CefSize(1024, 640);
  }

  cef_runtime_style_t GetWindowRuntimeStyle() override {
    return CEF_RUNTIME_STYLE_ALLOY;
  }

 private:
  CefRefPtr<Host> host_;

  IMPLEMENT_REFCOUNTING(WindowDelegate);
  DISALLOW_COPY_AND_ASSIGN(WindowDelegate);
};

// Used for the shell and for every tab: plain Chromium content with none of
// Chrome's own interface around it. NEXUS draws the browser UI.
class ViewDelegate : public CefBrowserViewDelegate {
 public:
  ViewDelegate() = default;

  cef_runtime_style_t GetBrowserRuntimeStyle() override {
    return CEF_RUNTIME_STYLE_ALLOY;
  }

 private:
  IMPLEMENT_REFCOUNTING(ViewDelegate);
  DISALLOW_COPY_AND_ASSIGN(ViewDelegate);
};

}  // namespace

// static
void Host::Create(const std::string& shell_url) {
  CEF_REQUIRE_UI_THREAD();
  CefRefPtr<Host> host(new Host(shell_url));

  CefRefPtr<CefDictionaryValue> extra_info = CefDictionaryValue::Create();
  extra_info->SetBool(kShellMarker, true);

  host->shell_view_ = CefBrowserView::CreateBrowserView(
      host, shell_url, CefBrowserSettings(), extra_info, nullptr,
      new ViewDelegate());
  CefWindow::CreateTopLevelWindow(new WindowDelegate(host));
}

// static
Host* Host::Get() {
  return g_host;
}

Host::Host(const std::string& shell_url)
    : shell_url_(shell_url), shell_origin_(OriginOf(shell_url)) {
  g_host = this;
  router_ = CefMessageRouterBrowserSide::Create(BridgeConfig());
  router_->AddHandler(this, false);
}

Host::~Host() {
  if (g_host == this) {
    g_host = nullptr;
  }
}

void Host::RequestQuit() {
  CEF_REQUIRE_UI_THREAD();
  if (window_) {
    window_->Close();
  } else {
    CefQuitMessageLoop();
  }
}

// --- Window ----------------------------------------------------------------

void Host::OnWindowCreated(CefRefPtr<CefWindow> window) {
  window_ = window;
  window_->SetTitle("NEXUS");
  window_->AddChildView(shell_view_);
  window_->Show();
  shell_view_->RequestFocus();
}

bool Host::CanCloseWindow() {
  // Tabs go first so no Chromium browser outlives the window.
  CloseAllTabs();
  CefRefPtr<CefBrowser> shell = shell_view_ ? shell_view_->GetBrowser() : nullptr;
  return shell ? shell->GetHost()->TryCloseBrowser() : true;
}

void Host::OnWindowDestroyed() {
  window_ = nullptr;
  shell_view_ = nullptr;
}

// --- Lookups ---------------------------------------------------------------

bool Host::IsShell(CefRefPtr<CefBrowser> browser) const {
  return shell_browser_ && shell_browser_->IsSame(browser);
}

Host::Tab* Host::FindTab(const std::string& id) {
  auto it = tabs_.find(id);
  return it == tabs_.end() ? nullptr : it->second.get();
}

Host::Tab* Host::FindTab(CefRefPtr<CefBrowser> browser) {
  for (auto& entry : tabs_) {
    if (entry.second->browser && entry.second->browser->IsSame(browser)) {
      return entry.second.get();
    }
  }
  return nullptr;
}

// --- Tabs ------------------------------------------------------------------

std::string Host::CreateTab() {
  CEF_REQUIRE_UI_THREAD();
  if (!window_) {
    return std::string();
  }

  auto tab = std::make_unique<Tab>();
  tab->id = "tab-" + std::to_string(next_tab_id_++);
  tab->title = "New Tab";
  tab->view = CefBrowserView::CreateBrowserView(
      this, kBlankUrl, CefBrowserSettings(), nullptr, nullptr,
      new ViewDelegate());
  // An overlay is a view that floats above the window's contents. It stays
  // hidden until the React UI says where the page area is.
  tab->overlay = window_->AddOverlayView(tab->view, CEF_DOCKING_MODE_CUSTOM,
                                         /*can_activate=*/true);
  tab->overlay->SetVisible(false);
  // Usually available as soon as the view is in a window; if not,
  // OnAfterCreated fills it in.
  tab->browser = tab->view->GetBrowser();

  const std::string id = tab->id;
  tabs_[id] = std::move(tab);
  EmitTab(*tabs_[id]);
  return id;
}

void Host::Navigate(Tab* tab, const std::string& url) {
  if (tab->browser) {
    tab->browser->GetMainFrame()->LoadURL(url);
  } else {
    tab->pending_url = url;
  }
}

void Host::CloseTab(const std::string& id) {
  CEF_REQUIRE_UI_THREAD();
  auto it = tabs_.find(id);
  if (it == tabs_.end()) {
    return;
  }
  // Take the tab out of the map first: Chromium may call back into this
  // class while the browser is being destroyed.
  std::unique_ptr<Tab> tab = std::move(it->second);
  tabs_.erase(it);

  if (tab->overlay && tab->overlay->IsValid()) {
    tab->overlay->Destroy();
  }
  tab->overlay = nullptr;
  tab->browser = nullptr;
  // This is the last reference to the view. Releasing it destroys the
  // Chromium browser and its renderer process.
  tab->view = nullptr;
}

void Host::CloseAllTabs() {
  while (!tabs_.empty()) {
    CloseTab(tabs_.begin()->first);
  }
  CancelPendingPolicyRequests();
}

void Host::ShowTab(const std::string& tab_id, const CefRect& bounds) {
  CEF_REQUIRE_UI_THREAD();
  for (auto& entry : tabs_) {
    Tab* tab = entry.second.get();
    if (!tab->overlay || !tab->overlay->IsValid()) {
      continue;
    }
    const bool show =
        tab->id == tab_id && bounds.width > 0 && bounds.height > 0;
    if (show) {
      tab->overlay->SetBounds(bounds);
    }
    if (tab->overlay->IsVisible() != show) {
      tab->overlay->SetVisible(show);
    }
  }
}

// --- Events to the React UI ------------------------------------------------

void Host::Emit(CefRefPtr<CefDictionaryValue> event) {
  if (!shell_browser_) {
    return;
  }
  CefRefPtr<CefFrame> frame = shell_browser_->GetMainFrame();
  if (!frame) {
    return;
  }
  // The event is JSON, which is also a valid JavaScript expression.
  frame->ExecuteJavaScript("window.__nexusNativeEvent&&window.__nexusNativeEvent(" +
                               ToJson(event) + ");",
                           frame->GetURL(), 0);
}

void Host::EmitTab(const Tab& tab) {
  CefRefPtr<CefDictionaryValue> state = CefDictionaryValue::Create();
  state->SetString("id", tab.id);
  state->SetString("url", tab.url);
  state->SetString("title", tab.title);
  state->SetBool("loading", tab.loading);
  state->SetBool("canGoBack", tab.can_go_back);
  state->SetBool("canGoForward", tab.can_go_forward);
  if (tab.error.empty()) {
    state->SetNull("error");
  } else {
    state->SetString("error", tab.error);
  }

  CefRefPtr<CefDictionaryValue> event = CefDictionaryValue::Create();
  event->SetString("type", "tab");
  event->SetDictionary("tab", state);
  Emit(event);
}

// --- Requests from the React UI --------------------------------------------

bool Host::OnQuery(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefFrame> frame,
                   int64_t query_id,
                   const CefString& request,
                   bool persistent,
                   CefRefPtr<Callback> callback) {
  CEF_REQUIRE_UI_THREAD();
  // Only the NEXUS desktop page may drive the browser. A website in a tab
  // has no bridge at all, and this is the second line of defence.
  if (!IsShell(browser) || !frame->IsMain()) {
    return false;
  }

  CefRefPtr<CefValue> parsed = CefParseJSON(request, JSON_PARSER_RFC);
  if (!parsed || parsed->GetType() != VTYPE_DICTIONARY) {
    callback->Failure(400, "Request is not a JSON object");
    return true;
  }
  CefRefPtr<CefDictionaryValue> args = parsed->GetDictionary();
  const std::string command = args->GetString("cmd");
  const std::string tab_id = args->GetString("tabId");

  if (command == "createTab") {
    const std::string id = CreateTab();
    if (id.empty()) {
      callback->Failure(503, "The NEXUS window is not ready");
    } else {
      callback->Success(id);
    }
    return true;
  }

  if (command == "showTab") {
    ShowTab(tab_id, CefRect(args->GetInt("x"), args->GetInt("y"),
                            args->GetInt("width"), args->GetInt("height")));
    callback->Success("");
    return true;
  }

  if (command == "closeTab") {
    CloseTab(tab_id);
    callback->Success("");
    return true;
  }

  if (command == "policyDecision") {
    ResolveNavigationPolicy(args->GetInt("requestId"),
                            args->GetBool("allowed"));
    callback->Success("");
    return true;
  }

  // Everything else acts on an existing tab.
  Tab* tab = FindTab(tab_id);
  if (!tab) {
    callback->Failure(404, "No such tab");
    return true;
  }

  if (command == "navigate") {
    const std::string url = args->GetString("url");
    // The address bar only ever produces web URLs; refuse anything else.
    if (!IsWebUrl(url)) {
      callback->Failure(400, "Only http and https addresses can be opened");
      return true;
    }
    Navigate(tab, url);
  } else if (!tab->browser) {
    // Nothing to go back in, reload or stop yet.
  } else if (command == "goBack") {
    tab->browser->GoBack();
  } else if (command == "goForward") {
    tab->browser->GoForward();
  } else if (command == "reload") {
    tab->browser->Reload();
  } else if (command == "stop") {
    tab->browser->StopLoad();
  } else {
    callback->Failure(400, "Unknown command");
    return true;
  }

  callback->Success("");
  return true;
}

bool Host::OnProcessMessageReceived(CefRefPtr<CefBrowser> browser,
                                    CefRefPtr<CefFrame> frame,
                                    CefProcessId source_process,
                                    CefRefPtr<CefProcessMessage> message) {
  return router_->OnProcessMessageReceived(browser, frame, source_process,
                                           message);
}

// --- Browser lifetime ------------------------------------------------------

void Host::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
  browser_count_++;

  CefRefPtr<CefBrowserView> view = CefBrowserView::GetForBrowser(browser);
  if (view && shell_view_ && view->IsSame(shell_view_)) {
    shell_browser_ = browser;
    return;
  }

  for (auto& entry : tabs_) {
    Tab* tab = entry.second.get();
    if (view && tab->view && view->IsSame(tab->view)) {
      tab->browser = browser;
      if (!tab->pending_url.empty()) {
        browser->GetMainFrame()->LoadURL(tab->pending_url);
        tab->pending_url.clear();
      }
      return;
    }
  }
}

void Host::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
  router_->OnBeforeClose(browser);

  if (IsShell(browser)) {
    shell_browser_ = nullptr;
  }
  if (--browser_count_ == 0) {
    // Every browser is gone: Chromium can shut down.
    router_->RemoveHandler(this);
    CefQuitMessageLoop();
  }
}

bool Host::OnBeforePopup(CefRefPtr<CefBrowser> browser,
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
                         bool* no_javascript_access) {
  CEF_REQUIRE_UI_THREAD();
  // Policy seam: no page gets to open a window of its own. A link that wants
  // a new window becomes a request for a new NEXUS tab, which goes through
  // the same policy check as anything typed in the address bar.
  Tab* tab = FindTab(browser);
  const std::string url = target_url.ToString();
  if (tab && user_gesture && IsWebUrl(url)) {
    CefRefPtr<CefDictionaryValue> event = CefDictionaryValue::Create();
    event->SetString("type", "popup");
    event->SetString("tabId", tab->id);
    event->SetString("url", url);
    Emit(event);
  }
  return true;  // Cancel the native popup.
}

// --- Page information ------------------------------------------------------

void Host::OnAddressChange(CefRefPtr<CefBrowser> browser,
                           CefRefPtr<CefFrame> frame,
                           const CefString& url) {
  CEF_REQUIRE_UI_THREAD();
  Tab* tab = FindTab(browser);
  if (!tab || !frame->IsMain()) {
    return;
  }
  const std::string value = url.ToString();
  // The blank page is the new-tab page, which NEXUS draws itself.
  tab->url = value == kBlankUrl ? std::string() : value;
  if (tab->url.empty()) {
    tab->title = "New Tab";
  }
  EmitTab(*tab);
}

void Host::OnTitleChange(CefRefPtr<CefBrowser> browser,
                         const CefString& title) {
  CEF_REQUIRE_UI_THREAD();
  Tab* tab = FindTab(browser);
  if (!tab || tab->url.empty()) {
    return;
  }
  tab->title = title.ToString();
  EmitTab(*tab);
}

void Host::OnLoadingStateChange(CefRefPtr<CefBrowser> browser,
                                bool isLoading,
                                bool canGoBack,
                                bool canGoForward) {
  CEF_REQUIRE_UI_THREAD();
  Tab* tab = FindTab(browser);
  if (!tab) {
    return;
  }
  tab->loading = isLoading;
  tab->can_go_back = canGoBack;
  tab->can_go_forward = canGoForward;
  EmitTab(*tab);
}

void Host::OnLoadStart(CefRefPtr<CefBrowser> browser,
                       CefRefPtr<CefFrame> frame,
                       TransitionType transition_type) {
  CEF_REQUIRE_UI_THREAD();
  if (!frame->IsMain()) {
    return;
  }
  if (IsShell(browser)) {
    // The NEXUS desktop (re)loaded, so its record of open tabs is gone.
    // Close ours too rather than leave browsers nobody can reach.
    CloseAllTabs();
    return;
  }
  if (Tab* tab = FindTab(browser)) {
    tab->error.clear();
  }
}

void Host::OnLoadError(CefRefPtr<CefBrowser> browser,
                       CefRefPtr<CefFrame> frame,
                       ErrorCode errorCode,
                       const CefString& errorText,
                       const CefString& failedUrl) {
  CEF_REQUIRE_UI_THREAD();
  Tab* tab = FindTab(browser);
  // Aborted and blocked loads are deliberate (Stop, or a policy refusal).
  if (!tab || !frame->IsMain() || errorCode == ERR_ABORTED ||
      errorCode == ERR_BLOCKED_BY_CLIENT) {
    return;
  }
  tab->error = errorText.ToString();
  tab->url = failedUrl.ToString();
  EmitTab(*tab);
}

// --- Navigation control ----------------------------------------------------

bool Host::OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                          CefRefPtr<CefFrame> frame,
                          CefRefPtr<CefRequest> request,
                          bool user_gesture,
                          bool is_redirect) {
  CEF_REQUIRE_UI_THREAD();
  router_->OnBeforeBrowse(browser, frame);

  // The shell holds the bridge to this process, so it must never leave the
  // NEXUS desktop's own address.
  if (IsShell(browser) && frame->IsMain()) {
    return OriginOf(request->GetURL().ToString()) != shell_origin_;
  }
  return false;
}

CefRefPtr<CefResourceRequestHandler> Host::GetResourceRequestHandler(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefRefPtr<CefRequest> request,
    bool is_navigation,
    bool is_download,
    const CefString& request_initiator,
    bool& disable_default_handling) {
  // Only a tab's top-level navigations are routed through policy.
  if (is_navigation && browser && !IsShell(browser) &&
      request->GetResourceType() == RT_MAIN_FRAME) {
    return this;
  }
  return nullptr;
}

void Host::OnRenderProcessTerminated(CefRefPtr<CefBrowser> browser,
                                     TerminationStatus status,
                                     int error_code,
                                     const CefString& error_string) {
  CEF_REQUIRE_UI_THREAD();
  router_->OnRenderProcessTerminated(browser);
  if (Tab* tab = FindTab(browser)) {
    tab->loading = false;
    tab->error = "The page stopped responding and was closed.";
    EmitTab(*tab);
  }
}

CefResourceRequestHandler::ReturnValue Host::OnBeforeResourceLoad(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefRefPtr<CefRequest> request,
    CefRefPtr<CefCallback> callback) {
  CEF_REQUIRE_IO_THREAD();
  const std::string url = request->GetURL().ToString();
  if (!browser || request->GetResourceType() != RT_MAIN_FRAME ||
      !IsWebUrl(url)) {
    return RV_CONTINUE;
  }
  // Hold the request until policy answers.
  CefPostTask(TID_UI, base::BindOnce(&Host::AskNavigationPolicy, this,
                                     browser->GetIdentifier(), url, callback));
  return RV_CONTINUE_ASYNC;
}

// --- Policy seam -----------------------------------------------------------

void Host::AskNavigationPolicy(int browser_id,
                               const std::string& url,
                               CefRefPtr<CefCallback> callback) {
  CEF_REQUIRE_UI_THREAD();
  Tab* tab = nullptr;
  for (auto& entry : tabs_) {
    if (entry.second->browser &&
        entry.second->browser->GetIdentifier() == browser_id) {
      tab = entry.second.get();
    }
  }
  // With nobody to ask, the safe answer is no.
  if (!tab || !shell_browser_) {
    callback->Cancel();
    return;
  }

  const int request_id = next_policy_id_++;
  pending_policy_[request_id] = callback;

  CefRefPtr<CefDictionaryValue> event = CefDictionaryValue::Create();
  event->SetString("type", "policy");
  event->SetInt("requestId", request_id);
  event->SetString("tabId", tab->id);
  event->SetString("url", url);
  Emit(event);
}

void Host::ResolveNavigationPolicy(int request_id, bool allowed) {
  auto it = pending_policy_.find(request_id);
  if (it == pending_policy_.end()) {
    return;
  }
  CefRefPtr<CefCallback> callback = it->second;
  pending_policy_.erase(it);
  if (allowed) {
    callback->Continue();
  } else {
    callback->Cancel();
  }
}

void Host::CancelPendingPolicyRequests() {
  for (auto& entry : pending_policy_) {
    entry.second->Cancel();
  }
  pending_policy_.clear();
}

}  // namespace nexus
