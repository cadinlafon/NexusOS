# The NEXUS native host: a small CEF application that shows the NEXUS desktop
# (the React app) and gives NEXUS Browser real Chromium tabs.
#
# Build with `npm run browser:build` from the project root.

cmake_minimum_required(VERSION 3.21)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

project(nexus_native)

# The prebuilt CEF binary distribution (see scripts/setup-cef.sh).
set(CEF_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/third_party/cef")
if(NOT EXISTS "${CEF_ROOT}/cmake/FindCEF.cmake")
  message(FATAL_ERROR "CEF is not set up. Run: npm run browser:setup")
endif()
list(APPEND CMAKE_MODULE_PATH "${CEF_ROOT}/cmake")
find_package(CEF REQUIRED)

# CEF's C++ wrapper library, built from the sources in the distribution.
add_subdirectory(${CEF_LIBCEF_DLL_WRAPPER_PATH} libcef_dll_wrapper)

if(NOT OS_MAC)
  message(FATAL_ERROR "Only the macOS development host exists so far. See docs/BROWSER_ENGINE.md.")
endif()

set(NEXUS_TARGET "NEXUS")
set(NEXUS_HELPER_TARGET "NEXUS_Helper")
set(NEXUS_HELPER_OUTPUT_NAME "NEXUS Helper")

# Shared by the app and its helper processes.
set(NEXUS_COMMON_SRCS
  src/nexus_renderer.cc
  src/nexus_renderer.h
  )
set(NEXUS_APP_SRCS
  ${NEXUS_COMMON_SRCS}
  src/main_mac.mm
  src/nexus_app.cc
  src/nexus_app.h
  src/nexus_host.cc
  src/nexus_host.h
  )
set(NEXUS_HELPER_SRCS
  ${NEXUS_COMMON_SRCS}
  src/helper_main_mac.cc
  )

SET_CEF_TARGET_OUT_DIR()
list(APPEND CEF_COMPILER_FLAGS -fobjc-arc)
include_directories(${CEF_ROOT} ${CMAKE_CURRENT_SOURCE_DIR})

set(NEXUS_APP "${CEF_TARGET_OUT_DIR}/${NEXUS_TARGET}.app")

# Main app bundle.
add_executable(${NEXUS_TARGET} MACOSX_BUNDLE ${NEXUS_APP_SRCS})
SET_EXECUTABLE_TARGET_PROPERTIES(${NEXUS_TARGET})
add_dependencies(${NEXUS_TARGET} libcef_dll_wrapper)
target_link_libraries(${NEXUS_TARGET} libcef_dll_wrapper ${CEF_STANDARD_LIBS})
set_target_properties(${NEXUS_TARGET} PROPERTIES
  MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/mac/Info.plist
  )

# Chromium's framework goes inside the bundle.
COPY_MAC_FRAMEWORK("${NEXUS_TARGET}" "${CEF_BINARY_DIR}" "${NEXUS_APP}")

# Chromium runs renderers, the GPU and so on in separate helper processes.
# macOS wants one small helper bundle per kind.
foreach(_suffix_list ${CEF_HELPER_APP_SUFFIXES})
  string(REPLACE ":" ";" _suffix_list ${_suffix_list})
  list(GET _suffix_list 0 _name_suffix)
  list(GET _suffix_list 1 _target_suffix)
  list(GET _suffix_list 2 _plist_suffix)

  set(_helper_target "${NEXUS_HELPER_TARGET}${_target_suffix}")
  set(_helper_output_name "${NEXUS_HELPER_OUTPUT_NAME}${_name_suffix}")

  set(_helper_info_plist "${CMAKE_CURRENT_BINARY_DIR}/helper-Info${_target_suffix}.plist")
  file(READ "${CMAKE_CURRENT_SOURCE_DIR}/mac/helper-Info.plist.in" _plist_contents)
  string(REPLACE "\${EXECUTABLE_NAME}" "${_helper_output_name}" _plist_contents ${_plist_contents})
  string(REPLACE "\${BUNDLE_ID_SUFFIX}" "${_plist_suffix}" _plist_contents ${_plist_contents})
  file(WRITE ${_helper_info_plist} ${_plist_contents})

  add_executable(${_helper_target} MACOSX_BUNDLE ${NEXUS_HELPER_SRCS})
  SET_EXECUTABLE_TARGET_PROPERTIES(${_helper_target})
  add_dependencies(${_helper_target} libcef_dll_wrapper)
  target_link_libraries(${_helper_target} libcef_dll_wrapper ${CEF_STANDARD_LIBS})
  set_target_properties(${_helper_target} PROPERTIES
    MACOSX_BUNDLE_INFO_PLIST ${_helper_info_plist}
    OUTPUT_NAME ${_helper_output_name}
    )

  add_dependencies(${NEXUS_TARGET} "${_helper_target}")
  add_custom_command(
    TARGET ${NEXUS_TARGET}
    POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
            "${CEF_TARGET_OUT_DIR}/${_helper_output_name}.app"
            "${NEXUS_APP}/Contents/Frameworks/${_helper_output_name}.app"
    VERBATIM
    )
endforeach()
