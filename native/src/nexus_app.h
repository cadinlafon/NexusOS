// The browser-process side of the CEF application. Once Chromium is up, it
// creates the NEXUS host window.

#ifndef NEXUS_NATIVE_SRC_NEXUS_APP_H_
#define NEXUS_NATIVE_SRC_NEXUS_APP_H_

#include <string>

#include "include/cef_app.h"

namespace nexus {

class App : public CefApp, public CefBrowserProcessHandler {
 public:
  // |shell_url| is where the NEXUS desktop (the React app) is served from.
  explicit App(const std::string& shell_url);

  CefRefPtr<CefBrowserProcessHandler> GetBrowserProcessHandler() override {
    return this;
  }

  // CefBrowserProcessHandler:
  void OnContextInitialized() override;

 private:
  const std::string shell_url_;

  IMPLEMENT_REFCOUNTING(App);
  DISALLOW_COPY_AND_ASSIGN(App);
};

}  // namespace nexus

#endif  // NEXUS_NATIVE_SRC_NEXUS_APP_H_
