// Entry point for the NEXUS native host on macOS.

#import <Cocoa/Cocoa.h>

#include <string>

#include "include/cef_app.h"
#import "include/cef_application_mac.h"
#include "include/cef_command_line.h"
#include "include/wrapper/cef_library_loader.h"
#include "src/nexus_app.h"
#include "src/nexus_host.h"

namespace {

// Where the NEXUS desktop is served from when no --url is given: the Vite
// development server.
const char kDefaultShellUrl[] = "http://localhost:5173";

// The application and Edit menus. Without an Edit menu, macOS does not route
// Cmd+C, Cmd+V and friends to text fields.
void BuildMainMenu() {
  NSMenu* menu_bar = [[NSMenu alloc] init];

  NSMenuItem* app_item = [[NSMenuItem alloc] init];
  NSMenu* app_menu = [[NSMenu alloc] init];
  [app_menu addItemWithTitle:@"Quit NEXUS"
                      action:@selector(terminate:)
               keyEquivalent:@"q"];
  app_item.submenu = app_menu;
  [menu_bar addItem:app_item];

  NSMenuItem* edit_item = [[NSMenuItem alloc] init];
  NSMenu* edit_menu = [[NSMenu alloc] initWithTitle:@"Edit"];
  [edit_menu addItemWithTitle:@"Undo" action:@selector(undo:) keyEquivalent:@"z"];
  [edit_menu addItemWithTitle:@"Redo" action:@selector(redo:) keyEquivalent:@"Z"];
  [edit_menu addItem:[NSMenuItem separatorItem]];
  [edit_menu addItemWithTitle:@"Cut" action:@selector(cut:) keyEquivalent:@"x"];
  [edit_menu addItemWithTitle:@"Copy" action:@selector(copy:) keyEquivalent:@"c"];
  [edit_menu addItemWithTitle:@"Paste" action:@selector(paste:) keyEquivalent:@"v"];
  [edit_menu addItemWithTitle:@"Select All"
                       action:@selector(selectAll:)
                keyEquivalent:@"a"];
  edit_item.submenu = edit_menu;
  [menu_bar addItem:edit_item];

  NSApp.mainMenu = menu_bar;
}

}  // namespace

// CEF needs to know when the application is in the middle of sending an
// event, which is what this NSApplication subclass reports.
@interface NexusApplication : NSApplication <CefAppProtocol> {
 @private
  BOOL handlingSendEvent_;
}
@end

@implementation NexusApplication
- (BOOL)isHandlingSendEvent {
  return handlingSendEvent_;
}

- (void)setHandlingSendEvent:(BOOL)handlingSendEvent {
  handlingSendEvent_ = handlingSendEvent;
}

- (void)sendEvent:(NSEvent*)event {
  CefScopedSendingEvent sendingEventScoper;
  [super sendEvent:event];
}

// Quit by closing the window, so Chromium shuts its browsers down in order.
// The message loop ends when the last one is gone.
- (void)terminate:(id)sender {
  if (nexus::Host* host = nexus::Host::Get()) {
    host->RequestQuit();
  }
}
@end

int main(int argc, char* argv[]) {
  // The CEF framework is loaded at runtime, as the macOS sandbox requires.
  CefScopedLibraryLoader library_loader;
  if (!library_loader.LoadInMain()) {
    return 1;
  }

  CefMainArgs main_args(argc, argv);

  @autoreleasepool {
    [NexusApplication sharedApplication];
    CHECK([NSApp isKindOfClass:[NexusApplication class]]);

    CefRefPtr<CefCommandLine> command_line = CefCommandLine::CreateCommandLine();
    command_line->InitFromArgv(argc, argv);

    std::string shell_url = command_line->GetSwitchValue("url").ToString();
    if (shell_url.empty()) {
      shell_url = kDefaultShellUrl;
    }

    CefSettings settings;
    // Cookies, cache and site data live here, separate from any other browser.
    NSString* data_dir = [NSSearchPathForDirectoriesInDomains(
        NSApplicationSupportDirectory, NSUserDomainMask, YES).firstObject
        stringByAppendingPathComponent:@"NEXUS"];
    CefString(&settings.root_cache_path) = data_dir.UTF8String;

    // Development only: `--remote-debugging-port=9222` exposes Chromium's
    // inspector so the pages NEXUS is rendering can be examined.
    if (command_line->HasSwitch("remote-debugging-port")) {
      settings.remote_debugging_port =
          std::stoi(command_line->GetSwitchValue("remote-debugging-port").ToString());
    }

    CefRefPtr<nexus::App> app(new nexus::App(shell_url));
    if (!CefInitialize(main_args, settings, app.get(), nullptr)) {
      return CefGetExitCode();
    }

    BuildMainMenu();
    [NSApp activateIgnoringOtherApps:YES];

    // Runs until the last browser has closed.
    CefRunMessageLoop();
    CefShutdown();
  }

  return 0;
}
