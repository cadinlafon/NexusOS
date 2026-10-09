#include "src/nexus_app.h"

#include "include/wrapper/cef_helpers.h"
#include "src/nexus_host.h"

namespace nexus {

App::App(const std::string& shell_url) : shell_url_(shell_url) {}

void App::OnContextInitialized() {
  CEF_REQUIRE_UI_THREAD();
  Host::Create(shell_url_);
}

}  // namespace nexus
